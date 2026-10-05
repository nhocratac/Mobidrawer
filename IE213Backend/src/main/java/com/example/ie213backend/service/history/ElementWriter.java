package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.BoardTx;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Supplier;

// Đường ghi duy nhất vào boardElements: lock theo board, WAL một document, op log, broadcast batch
@Service
@RequiredArgsConstructor
public class ElementWriter {
    private static final Duration MERGE_WINDOW = Duration.ofSeconds(3);

    private final MongoTemplate mongo;
    private final BoardLocks locks;
    private final BatchPublisher publisher;

    // chỉ test thay: đồng hồ cho cửa sổ merge, hook giả lập lỗi sau WAL
    Clock clock = Clock.systemUTC();
    Runnable afterWalHook = () -> {
    };

    // setter injection: giữ nguyên constructor (MongoTemplate, BoardLocks, BatchPublisher) mà các test tự new
    private SnapshotJob snapshotJob;

    @Autowired(required = false)
    void setSnapshotJob(SnapshotJob snapshotJob) {
        this.snapshotJob = snapshotJob;
    }

    public record CommitRequest(String boardId, String userId, String sessionId, String source, List<Intent> intents,
                                String mergeKey, String target) {
    }

    public record CommitResult(String txId, long seqFrom, long seqTo, List<BoardOp> ops) {
        public static final CommitResult EMPTY = new CommitResult(null, 0, 0, List.of());

        public boolean isEmpty() {
            return txId == null;
        }
    }

    public <T> T withLock(String boardId, Supplier<T> fn) {
        return locks.withLock(boardId, () -> {
            rollForward(boardId);
            return fn.get();
        });
    }

    public CommitResult commit(CommitRequest req) {
        // gọi lồng trong withLock của UndoService/HistoryService: đã roll-forward rồi
        if (locks.isHeldByCurrentThread(req.boardId())) return doCommit(req);
        return withLock(req.boardId(), () -> doCommit(req));
    }

    public Map<String, Map<String, Object>> loadBoard(String boardId) {
        Map<String, Map<String, Object>> board = new LinkedHashMap<>();
        mongo.find(Query.query(Criteria.where("boardId").is(oid(boardId))), BoardElement.class)
                .forEach(e -> board.put(e.getId(), ElementNormalizer.full(e)));
        return board;
    }

    public long committedSeq(String boardId) {
        BoardCounter counter = mongo.findOne(Query.query(Criteria.where("_id").is(oid(boardId))), BoardCounter.class);
        return counter == null ? 0L : counter.getCommittedSeq();
    }

    public List<BoardOp> opsOfTx(String boardId, String txId) {
        return mongo.find(Query.query(Criteria.where("boardId").is(oid(boardId)).and("txId").is(txId))
                .with(Sort.by(Sort.Direction.ASC, "seq")), BoardOp.class);
    }

    public List<BoardOp> laterOps(String boardId, String elementId, long afterSeq) {
        return mongo.find(Query.query(Criteria.where("boardId").is(oid(boardId)).and("elementId").is(elementId)
                .and("seq").gt(afterSeq)).with(Sort.by(Sort.Direction.ASC, "seq")), BoardOp.class);
    }

    private CommitResult doCommit(CommitRequest req) {
        String boardId = req.boardId();
        ensureCounter(boardId);
        List<Intent> intents = dropForeignCreates(boardId, req.intents());
        List<BoardOp> planned = CommitPlanner.plan(intents, loadBoard(boardId), id -> lastVersion(boardId, id));
        if (planned.isEmpty()) return CommitResult.EMPTY;

        int n = planned.size();
        BoardCounter counter = mongo.findAndModify(Query.query(Criteria.where("_id").is(oid(boardId))),
                new Update().inc("seq", n), FindAndModifyOptions.options().returnNew(true), BoardCounter.class);
        long seqTo = counter.getSeq();
        long seqFrom = seqTo - n + 1;
        Instant now = clock.instant();

        BoardTx merged = mergeTarget(req, now);
        String txId = merged != null ? merged.getId() : new ObjectId().toHexString();
        List<BoardOp> ops = new ArrayList<>(n);
        for (int i = 0; i < n; i++)
            ops.add(stamp(planned.get(i), boardId, seqFrom + i, txId, req.userId(), now));
        BoardTx.Summary summary = summarize(ops);
        BoardTx.Pending pending = new BoardTx.Pending(seqFrom, seqTo, ops);

        // WAL: một document nên atomic
        BoardTx tx;
        if (merged != null) {
            BoardTx.Summary old = merged.getSummary() == null ? new BoardTx.Summary(0, 0, 0) : merged.getSummary();
            BoardTx.Prev prev = new BoardTx.Prev(merged.getSeqTo(), old, merged.getTs());
            BoardTx.Summary total = new BoardTx.Summary(old.getCreated() + summary.getCreated(),
                    old.getPatched() + summary.getPatched(), old.getDeleted() + summary.getDeleted());
            mongo.updateFirst(Query.query(Criteria.where("_id").is(oid(txId))), new Update()
                    .set("state", "pending").set("pending", pending).set("prev", prev)
                    .set("seqTo", seqTo).set("summary", total).set("ts", now), BoardTx.class);
            merged.setState("pending");
            merged.setPending(pending);
            merged.setPrev(prev);
            merged.setSeqTo(seqTo);
            merged.setSummary(total);
            merged.setTs(now);
            tx = merged;
        } else {
            tx = new BoardTx();
            tx.setId(txId);
            tx.setBoardId(boardId);
            tx.setUserId(req.userId());
            tx.setTs(now);
            tx.setSeqFrom(seqFrom);
            tx.setSeqTo(seqTo);
            tx.setSource(req.source());
            tx.setTarget(req.target());
            tx.setMergeKey(req.mergeKey());
            tx.setState("pending");
            tx.setPending(pending);
            tx.setSummary(summary);
            mongo.insert(tx);
        }
        afterWalHook.run();

        ops.forEach(op -> apply(boardId, op));
        postCommit(tx);
        // vẫn trong lock: simple broker gửi đồng bộ nên thứ tự message = thứ tự seq
        publisher.publish(boardId, new BatchEvent(txId, req.source(), seqFrom, seqTo, req.sessionId(), req.userId(),
                eventOps(ops)));
        // §6.3 bước 14: seqTo vượt bội số 200 thì chụp snapshot (bất đồng bộ, lỗi chỉ log)
        if (snapshotJob != null) snapshotJob.maybeSnapshot(boardId, seqFrom - 1, seqTo);
        return new CommitResult(txId, seqFrom, seqTo, ops);
    }

    // Lỗi sau WAL: áp lại op của tx pending (tối đa một), không broadcast; client lệch sẽ tự reload theo hụt seq
    private void rollForward(String boardId) {
        BoardTx tx = mongo.findOne(Query.query(Criteria.where("boardId").is(oid(boardId)).and("state").is("pending")),
                BoardTx.class);
        if (tx == null) return;
        if (tx.getPending() != null && tx.getPending().getOps() != null)
            tx.getPending().getOps().forEach(op -> apply(boardId, op));
        postCommit(tx);
    }

    // Board chưa có counter: chụp snapshot 0 trước; $setOnInsert nên chạy lại sau lỗi dở dang vẫn an toàn
    private void ensureCounter(String boardId) {
        Object bid = oid(boardId);
        Query counterQuery = Query.query(Criteria.where("_id").is(bid));
        if (mongo.exists(counterQuery, BoardCounter.class)) return;
        List<Map<String, Object>> elements = new ArrayList<>(loadBoard(boardId).values());
        mongo.upsert(Query.query(Criteria.where("boardId").is(bid).and("seq").is(0L)),
                new Update().setOnInsert("elements", elements), BoardSnapshot.class);
        mongo.upsert(counterQuery, new Update().setOnInsert("seq", 0L).setOnInsert("committedSeq", 0L), BoardCounter.class);
    }

    // _id đã có ở board khác thì bỏ create (giữ hành vi cũ), để save() không ghi đè element của board khác
    private List<Intent> dropForeignCreates(String boardId, List<Intent> intents) {
        List<Object> createIds = intents.stream()
                .filter(i -> "create".equals(i.kind()) && i.elementId() != null)
                .map(i -> oid(i.elementId())).toList();
        if (createIds.isEmpty()) return intents;
        Set<String> foreign = new HashSet<>();
        mongo.find(Query.query(Criteria.where("_id").in(createIds).and("boardId").ne(oid(boardId))), BoardElement.class)
                .forEach(e -> foreign.add(e.getId()));
        if (foreign.isEmpty()) return intents;
        return intents.stream().filter(i -> !("create".equals(i.kind()) && foreign.contains(i.elementId()))).toList();
    }

    private long lastVersion(String boardId, String elementId) {
        BoardOp last = mongo.findOne(Query.query(Criteria.where("boardId").is(oid(boardId)).and("elementId").is(elementId))
                .with(Sort.by(Sort.Direction.DESC, "seq")).limit(1), BoardOp.class);
        return last == null ? 0L : last.getV();
    }

    private BoardTx mergeTarget(CommitRequest req, Instant now) {
        if (req.mergeKey() == null) return null;
        BoardTx last = mongo.findOne(Query.query(Criteria.where("boardId").is(oid(req.boardId()))
                        .and("userId").is(req.userId())).with(Sort.by(Sort.Direction.DESC, "seqTo")).limit(1),
                BoardTx.class);
        if (last == null || !req.mergeKey().equals(last.getMergeKey()) || !"active".equals(last.getState())) return null;
        return Duration.between(last.getTs(), now).compareTo(MERGE_WINDOW) < 0 ? last : null;
    }

    // Gắn seq/txId/userId/ts, thay sentinel SEQ bằng seq của op
    private static BoardOp stamp(BoardOp planned, String boardId, long seq, String txId, String userId, Instant now) {
        Map<String, Long> fsAfter = new HashMap<>();
        if (planned.getFsAfter() != null)
            planned.getFsAfter().forEach((k, s) -> fsAfter.put(k, s.longValue() == CommitPlanner.SEQ ? seq : s));
        Map<String, Object> after = planned.getAfter();
        if ("create".equals(planned.getKind()) && after != null) {
            after = new LinkedHashMap<>(after);
            after.put("fieldSeq", new HashMap<>(fsAfter));
            after.put("version", planned.getV());
        }
        BoardOp op = new BoardOp();
        op.setBoardId(boardId);
        op.setSeq(seq);
        op.setTxId(txId);
        op.setUserId(userId);
        op.setTs(now);
        op.setKind(planned.getKind());
        op.setElementId(planned.getElementId());
        op.setBefore(planned.getBefore());
        op.setAfter(after);
        op.setFsBefore(planned.getFsBefore());
        op.setFsAfter(fsAfter);
        op.setV(planned.getV());
        return op;
    }

    private static BoardTx.Summary summarize(List<BoardOp> ops) {
        int created = 0, patched = 0, deleted = 0;
        for (BoardOp op : ops) {
            switch (op.getKind()) {
                case "create" -> created++;
                case "patch" -> patched++;
                default -> deleted++;
            }
        }
        return new BoardTx.Summary(created, patched, deleted);
    }

    // Idempotent: upsert op theo (boardId, seq); patch dùng $set version thay vì $inc
    private void apply(String boardId, BoardOp op) {
        Object bid = oid(boardId);
        mongo.upsert(Query.query(Criteria.where("boardId").is(bid).and("seq").is(op.getSeq())), new Update()
                .set("txId", op.getTxId()).set("userId", op.getUserId()).set("ts", op.getTs())
                .set("kind", op.getKind()).set("elementId", op.getElementId())
                .set("before", op.getBefore()).set("after", op.getAfter())
                .set("fsBefore", op.getFsBefore()).set("fsAfter", op.getFsAfter()).set("v", op.getV()), BoardOp.class);
        Map<String, Long> fsAfter = op.getFsAfter() == null ? Map.of() : op.getFsAfter();
        Query element = Query.query(Criteria.where("_id").is(oid(op.getElementId())).and("boardId").is(bid));
        switch (op.getKind()) {
            case "create" -> {
                BoardElement e = ElementNormalizer.toElement(op.getAfter());
                e.setBoardId(boardId);
                e.setFieldSeq(new HashMap<>(fsAfter));
                e.setVersion(op.getV());
                e.setUpdateAt(LocalDateTime.now(clock));
                mongo.save(e);
            }
            case "patch" -> {
                Update update = new Update();
                op.getAfter().forEach(update::set);
                fsAfter.forEach((k, s) -> update.set("fieldSeq." + k, s));
                update.set("version", op.getV()).currentDate("updateAt");
                mongo.updateFirst(element, update, BoardElement.class);
            }
            case "delete" -> mongo.remove(element, BoardElement.class);
            default -> throw new IllegalStateException("unknown op kind: " + op.getKind());
        }
    }

    // §6.6, suy ra từ chính document tx; đánh dấu active sau cùng để roll-forward chạy lại được cả khối
    private void postCommit(BoardTx tx) {
        Object bid = oid(tx.getBoardId());
        String source = tx.getSource();
        if ("user".equals(source) || "restore".equals(source))
            mongo.updateMulti(Query.query(Criteria.where("boardId").is(bid).and("userId").is(tx.getUserId())
                    .and("state").is("undone")), new Update().set("state", "dead"), BoardTx.class);
        if ("undo".equals(source) && tx.getTarget() != null)
            mongo.updateFirst(Query.query(Criteria.where("_id").is(oid(tx.getTarget())).and("state").is("active")),
                    new Update().set("state", "undone"), BoardTx.class);
        if ("redo".equals(source) && tx.getTarget() != null)
            mongo.updateFirst(Query.query(Criteria.where("_id").is(oid(tx.getTarget())).and("state").is("undone")),
                    new Update().set("state", "dead"), BoardTx.class);
        mongo.updateFirst(Query.query(Criteria.where("_id").is(bid)), new Update().max("committedSeq", tx.getSeqTo()),
                BoardCounter.class);
        mongo.updateFirst(Query.query(Criteria.where("_id").is(oid(tx.getId()))),
                new Update().set("state", "active").unset("pending"), BoardTx.class);
    }

    // Gom các op liên tiếp cùng kind thành một entry, giữ thứ tự seq
    static List<Map<String, Object>> eventOps(List<BoardOp> ops) {
        List<Map<String, Object>> out = new ArrayList<>();
        String kind = null;
        List<Object> items = null;
        for (BoardOp op : ops) {
            if (!op.getKind().equals(kind)) {
                kind = op.getKind();
                items = new ArrayList<>();
                Map<String, Object> group = new LinkedHashMap<>();
                group.put("op", kind);
                group.put(switch (kind) {
                    case "create" -> "elements";
                    case "patch" -> "patches";
                    default -> "ids";
                }, items);
                out.add(group);
            }
            switch (kind) {
                case "create" -> items.add(op.getAfter());
                case "patch" -> {
                    Map<String, Object> patch = new LinkedHashMap<>();
                    patch.put("id", op.getElementId());
                    patch.put("set", op.getAfter());
                    patch.put("version", op.getV());
                    items.add(patch);
                }
                default -> items.add(op.getElementId());
            }
        }
        return out;
    }

    private static Object oid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
