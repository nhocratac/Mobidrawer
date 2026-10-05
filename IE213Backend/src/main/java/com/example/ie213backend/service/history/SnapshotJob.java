package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.BoardTx;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.types.ObjectId;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.TimeUnit;

// Snapshot board mỗi 200 seq để dựng trạng thái lịch sử không phải replay từ đầu (spec §8.2)
@Slf4j
@Service
@RequiredArgsConstructor
public class SnapshotJob {
    static final long EVERY = 200;

    private final MongoTemplate mongo;
    // một thread: snapshot chạy tuần tự, không giữ lock của board
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "board-snapshot");
        t.setDaemon(true);
        return t;
    });

    public void maybeSnapshot(String boardId, long prevSeqTo, long seqTo) {
        if (seqTo / EVERY <= prevSeqTo / EVERY) return;
        long at = (seqTo / EVERY) * EVERY;
        try {
            executor.submit(() -> {
                try {
                    build(boardId, at);
                } catch (Exception e) {
                    log.error("snapshot failed board={} seq={}", boardId, at, e);
                }
            });
        } catch (RejectedExecutionException e) {
            // snapshot là best-effort (§8.2): đã shutdown thì bỏ qua, commit đã bền
            log.warn("snapshot skipped (executor shut down) board={} seq={}", boardId, at);
        }
    }

    public BoardSnapshot build(String boardId, long seq) {
        BoardSnapshot existing = exact(boardId, seq);
        if (existing != null) return existing;
        BoardSnapshot snap = new BoardSnapshot();
        snap.setBoardId(boardId);
        snap.setSeq(seq);
        snap.setElements(new ArrayList<>(replayTo(boardId, seq).values()));
        try {
            return mongo.insert(snap);
        } catch (DuplicateKeyException e) {
            // lần build khác vừa ghi cùng (boardId, seq): nội dung giống nhau
            return exact(boardId, seq);
        }
    }

    // Trạng thái tại seq: snapshot gần nhất <= seq + replay op đã commit trong (snap.seq, seq]
    Map<String, Map<String, Object>> replayTo(String boardId, long seq) {
        Object bid = oid(boardId);
        BoardSnapshot snap = mongo.findOne(Query.query(Criteria.where("boardId").is(bid).and("seq").lte(seq))
                .with(Sort.by(Sort.Direction.DESC, "seq")).limit(1), BoardSnapshot.class);
        Map<String, Map<String, Object>> base = new LinkedHashMap<>();
        long from = 0;
        if (snap != null) {
            if (snap.getElements() != null)
                snap.getElements().forEach(e -> base.put((String) e.get("id"), e));
            from = snap.getSeq();
        } else if (!mongo.exists(Query.query(Criteria.where("_id").is(bid)), BoardCounter.class)) {
            // board chưa từng commit qua writer: trạng thái hiện tại chính là seq 0
            mongo.find(Query.query(Criteria.where("boardId").is(bid)), BoardElement.class)
                    .forEach(e -> base.put(e.getId(), ElementNormalizer.full(e)));
            return base;
        }
        List<long[]> pending = pendingRanges(bid);
        List<BoardOp> ops = mongo.find(Query.query(Criteria.where("boardId").is(bid).and("seq").gt(from).lte(seq))
                        .with(Sort.by(Sort.Direction.ASC, "seq")), BoardOp.class).stream()
                .filter(op -> pending.stream().noneMatch(r -> op.getSeq() >= r[0] && op.getSeq() <= r[1]))
                .toList();
        return HistoryMath.replay(base, ops);
    }

    // Dải seq của tx đang pending (tx merge giữ nguyên các op đã commit trước đó)
    private List<long[]> pendingRanges(Object bid) {
        List<long[]> ranges = new ArrayList<>();
        mongo.find(Query.query(Criteria.where("boardId").is(bid).and("state").is("pending")), BoardTx.class)
                .forEach(tx -> ranges.add(tx.getPending() != null
                        ? new long[]{tx.getPending().getSeqFrom(), tx.getPending().getSeqTo()}
                        : new long[]{tx.getSeqFrom(), tx.getSeqTo()}));
        return ranges;
    }

    private BoardSnapshot exact(String boardId, long seq) {
        return mongo.findOne(Query.query(Criteria.where("boardId").is(oid(boardId)).and("seq").is(seq)),
                BoardSnapshot.class);
    }

    @PreDestroy
    void shutdown() {
        executor.shutdown();
        try {
            executor.awaitTermination(5, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static Object oid(String id) {
        return ObjectId.isValid(id) ? new ObjectId(id) : id;
    }
}
