package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.BoardTx;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.LongStream;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

// Chạy với Mongo local: MONGO_IT_URI=mongodb://localhost:27017
@EnabledIfEnvironmentVariable(named = "MONGO_IT_URI", matches = ".+")
class ElementWriterIT {
    static final List<String> COMPARED = Stream.concat(Stream.of("type", "image"), ElementKeys.K.stream()).toList();

    MongoClient client;
    MongoTemplate mongo;
    ElementWriter writer;
    final List<BatchEvent> events = new CopyOnWriteArrayList<>();
    final String board = new ObjectId().toHexString();

    static final class MutableClock extends Clock {
        Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }
    }

    @BeforeEach
    void setUp() {
        client = MongoClients.create(System.getenv("MONGO_IT_URI"));
        mongo = new MongoTemplate(client, "it_" + UUID.randomUUID().toString().replace("-", ""));
        // MongoTemplate dựng tay không tự tạo index: tạo unique (boardId, seq) để trùng seq là lỗi thật
        mongo.indexOps(BoardOp.class).ensureIndex(new Index().on("boardId", Sort.Direction.ASC)
                .on("seq", Sort.Direction.ASC).unique());
        writer = new ElementWriter(mongo, new BoardLocks(), (boardId, ev) -> events.add(ev));
    }

    @AfterEach
    void tearDown() {
        mongo.getDb().drop();
        client.close();
    }

    // ---- helpers ----

    private BoardElement element(String type) {
        BoardElement e = new BoardElement();
        e.setId(new ObjectId().toHexString());
        e.setBoardId(board);
        e.setType(type);
        e.setW(100);
        e.setH(80);
        e.setOwner(new ObjectId().toHexString());
        e.setVersion(1L);
        return e;
    }

    // element "legacy": ghi thẳng, không có fieldSeq
    private BoardElement seed(BoardElement e) {
        return mongo.insert(e);
    }

    private ElementWriter.CommitResult patch(String user, String id, Map<String, Object> set, String mergeKey) {
        return writer.commit(new ElementWriter.CommitRequest(board, user, "s-" + user, "user",
                List.of(Intent.patch(id, ElementNormalizer.normalizeSet(set))), mergeKey, null));
    }

    private Query byBoard() {
        return Query.query(Criteria.where("boardId").is(new ObjectId(board)));
    }

    private List<BoardOp> ops() {
        return mongo.find(byBoard().with(Sort.by("seq")), BoardOp.class);
    }

    private List<BoardTx> txs() {
        return mongo.find(byBoard().with(Sort.by("seqTo")), BoardTx.class);
    }

    private List<BoardSnapshot> snapshots() {
        return mongo.find(byBoard(), BoardSnapshot.class);
    }

    private BoardCounter counter() {
        return mongo.findOne(Query.query(Criteria.where("_id").is(new ObjectId(board))), BoardCounter.class);
    }

    private BoardTx tx(String id) {
        return mongo.findOne(Query.query(Criteria.where("_id").is(new ObjectId(id))), BoardTx.class);
    }

    private BoardElement live(String id) {
        return mongo.findById(id, BoardElement.class);
    }

    private String seedTx(String user, String state) {
        BoardTx t = new BoardTx();
        t.setId(new ObjectId().toHexString());
        t.setBoardId(board);
        t.setUserId(user);
        t.setTs(Instant.now());
        t.setSource("user");
        t.setState(state);
        t.setSummary(new BoardTx.Summary(0, 1, 0));
        mongo.insert(t);
        return t.getId();
    }

    // Invariant §8.2: replay(snapshot 0 + mọi op) == boardElements trên id, type, image và K
    private void assertInvariant() {
        BoardSnapshot snap0 = mongo.findOne(Query.query(Criteria.where("boardId").is(new ObjectId(board))
                .and("seq").is(0L)), BoardSnapshot.class);
        assertNotNull(snap0, "phải có snapshot 0");
        Map<String, Map<String, Object>> base = new LinkedHashMap<>();
        snap0.getElements().forEach(e -> base.put((String) e.get("id"), e));
        Map<String, Map<String, Object>> replayed = HistoryMath.replay(base, ops());
        Map<String, Map<String, Object>> current = writer.loadBoard(board);
        assertEquals(current.keySet(), replayed.keySet());
        current.forEach((id, el) -> COMPARED.forEach(k -> assertTrue(
                ElementNormalizer.same(el.get(k), replayed.get(id).get(k)),
                id + "." + k + ": " + el.get(k) + " vs " + replayed.get(id).get(k))));
    }

    @SuppressWarnings("unchecked")
    private void assertNoDanglingConnector() {
        Map<String, Map<String, Object>> current = writer.loadBoard(board);
        current.values().stream().filter(ElementKeys::isConnector).forEach(conn -> {
            for (String end : ElementKeys.connectorEnds((Map<String, Object>) conn.get("connector")))
                assertTrue(current.containsKey(end), "connector " + conn.get("id") + " trỏ tới " + end + " không tồn tại");
        });
    }

    // ---- tests ----

    @Test
    void firstCommitOnLegacyBoardCreatesSnapshotZeroAndCounter() {
        BoardElement a = element("sticky");
        a.setVersion(3L);
        seed(a);
        seed(element("sticky"));
        assertNull(counter());
        assertEquals(0, writer.committedSeq(board), "chưa có counter thì committedSeq = 0");

        ElementWriter.CommitResult r = patch("u1", a.getId(), Map.of("x", 50), null);

        assertEquals(1, r.seqFrom());
        assertEquals(1, r.seqTo());
        assertEquals(1, counter().getSeq());
        assertEquals(1, counter().getCommittedSeq());
        assertEquals(1, writer.committedSeq(board));
        List<BoardSnapshot> snaps = snapshots();
        assertEquals(1, snaps.size());
        assertEquals(0, snaps.get(0).getSeq());
        assertEquals(2, snaps.get(0).getElements().size());
        Map<String, Object> snapA = snaps.get(0).getElements().stream()
                .filter(e -> a.getId().equals(e.get("id"))).findFirst().orElseThrow();
        assertTrue(ElementNormalizer.same(0.0, snapA.get("x")), "snapshot 0 chụp trạng thái trước commit đầu");

        BoardOp op = ops().get(0);
        assertEquals("patch", op.getKind());
        assertEquals(0L, op.getFsBefore().getOrDefault("x", 0L), "thiếu fieldSeq thì fs mặc định 0");
        assertEquals(1L, op.getFsAfter().get("x"));
        assertEquals(4L, op.getV());
        BoardElement liveA = live(a.getId());
        assertEquals(50.0, liveA.getX());
        assertEquals(4L, liveA.getVersion());
        assertEquals(1L, liveA.getFieldSeq().get("x"));
        BoardTx t = tx(r.txId());
        assertEquals("active", t.getState());
        assertNull(t.getPending());
        assertEquals("user", t.getSource());
        assertEquals(1, t.getSummary().getPatched());
        assertInvariant();
    }

    @Test
    void twoThreadsPatchingSameElementGetContiguousSeqs() throws Exception {
        BoardElement a = seed(element("shape"));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        List<Future<?>> futures = new ArrayList<>();
        for (String user : List.of("u1", "u2"))
            futures.add(pool.submit(() -> {
                for (int i = 0; i < 100; i++) {
                    // giá trị khác nhau giữa hai user: ghi lại giá trị cũ không còn tăng dấu fieldSeq
                    double v = ("u1".equals(user) ? 0 : 1000) + i;
                    patch(user, a.getId(), Map.of("x", v, "y", v), null);
                }
            }));
        for (Future<?> f : futures) f.get(60, TimeUnit.SECONDS);
        pool.shutdown();

        List<Long> expected = LongStream.rangeClosed(1, 200).boxed().toList();
        assertEquals(expected, ops().stream().map(BoardOp::getSeq).toList(), "seq liền mạch 1..200");
        assertEquals(200, counter().getSeq());
        assertEquals(200, counter().getCommittedSeq());
        List<BoardTx> all = txs();
        assertEquals(200, all.size());
        assertTrue(all.stream().allMatch(t -> "active".equals(t.getState()) && t.getPending() == null));
        BoardElement liveA = live(a.getId());
        assertEquals(201L, liveA.getVersion());
        assertEquals(200L, liveA.getFieldSeq().get("x"));
        assertEquals(expected, events.stream().map(BatchEvent::seqFrom).toList(), "broadcast theo đúng thứ tự seq");
        assertInvariant();
    }

    @Test
    void twoThreadsPatchingDifferentElementsGetContiguousSeqs() throws Exception {
        BoardElement a = seed(element("shape"));
        BoardElement b = seed(element("shape"));
        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<?> fa = pool.submit(() -> {
            for (int i = 0; i < 100; i++) patch("u1", a.getId(), Map.of("x", (double) i), null);
        });
        Future<?> fb = pool.submit(() -> {
            for (int i = 0; i < 100; i++) patch("u2", b.getId(), Map.of("y", (double) i), null);
        });
        fa.get(60, TimeUnit.SECONDS);
        fb.get(60, TimeUnit.SECONDS);
        pool.shutdown();

        assertEquals(LongStream.rangeClosed(1, 200).boxed().toList(), ops().stream().map(BoardOp::getSeq).toList());
        assertEquals(200, counter().getCommittedSeq());
        assertEquals(101L, live(a.getId()).getVersion());
        assertEquals(101L, live(b.getId()).getVersion());
        assertEquals(99.0, live(a.getId()).getX());
        assertEquals(99.0, live(b.getId()).getY());
        assertInvariant();
    }

    @Test
    void crashAfterWalOnCascadeDeleteRollsForwardOnNextCommit() {
        BoardElement a = seed(element("shape"));
        BoardElement b = seed(element("shape"));
        BoardElement c = element("connector");
        c.setConnector(new BoardElement.ConnectorData(
                new BoardElement.End(a.getId(), "right"), new BoardElement.End(b.getId(), "left")));
        seed(c);

        writer.afterWalHook = () -> {
            throw new IllegalStateException("crash after WAL");
        };
        ElementWriter.CommitRequest del = new ElementWriter.CommitRequest(board, "u1", "s1", "user",
                List.of(Intent.delete(a.getId())), null, null);
        assertThrows(IllegalStateException.class, () -> writer.commit(del));

        BoardTx pending = txs().get(0);
        assertEquals("pending", pending.getState());
        assertEquals(1, pending.getPending().getSeqFrom());
        assertEquals(2, pending.getPending().getSeqTo(), "delete A + cascade connector C");
        assertEquals(List.of("delete", "delete"), pending.getPending().getOps().stream().map(BoardOp::getKind).toList());
        assertTrue(ops().isEmpty(), "chưa apply op nào");
        assertNotNull(live(a.getId()));
        assertEquals(0, counter().getCommittedSeq());
        assertTrue(events.isEmpty());

        writer.afterWalHook = () -> {
        };
        ElementWriter.CommitResult next = patch("u2", b.getId(), Map.of("x", 7), null);

        assertEquals(3, next.seqFrom());
        assertEquals(List.of(1L, 2L, 3L), ops().stream().map(BoardOp::getSeq).toList(), "mọi op trong dải đều tồn tại");
        BoardTx rolled = tx(pending.getId());
        assertEquals("active", rolled.getState());
        assertNull(rolled.getPending());
        assertNull(live(a.getId()));
        assertNull(live(c.getId()));
        assertEquals(3, counter().getCommittedSeq());
        assertEquals(1, events.size(), "roll-forward không broadcast");
        assertEquals(3, events.get(0).seqFrom());
        assertNoDanglingConnector();
        assertInvariant();
    }

    @Test
    void mergeKeyMergesWithinSlidingThreeSecondsElseNewTx() {
        BoardElement a = seed(element("sticky"));
        MutableClock clock = new MutableClock(Instant.parse("2026-09-25T10:00:00Z"));
        writer.clock = clock;
        String key = "text:" + a.getId() + ":e1";

        ElementWriter.CommitResult r1 = patch("u1", a.getId(), Map.of("text", "a"), key);
        clock.advance(Duration.ofSeconds(2));
        ElementWriter.CommitResult r2 = patch("u1", a.getId(), Map.of("text", "ab"), key);
        clock.advance(Duration.ofSeconds(2)); // 4s sau r1 nhưng 2s sau r2: cửa sổ trượt
        ElementWriter.CommitResult r3 = patch("u1", a.getId(), Map.of("text", "abc"), key);

        assertEquals(r1.txId(), r2.txId());
        assertEquals(r1.txId(), r3.txId());
        BoardTx merged = tx(r1.txId());
        assertEquals(1, merged.getSeqFrom());
        assertEquals(3, merged.getSeqTo());
        assertEquals(3, merged.getSummary().getPatched());
        assertEquals(Instant.parse("2026-09-25T10:00:04Z"), merged.getTs(), "ts = now mỗi lần merge");
        assertEquals(2, merged.getPrev().getSeqTo());
        assertEquals(2, merged.getPrev().getSummary().getPatched());
        assertEquals("active", merged.getState());
        assertNull(merged.getPending());
        assertEquals(List.of(r1.txId(), r1.txId(), r1.txId()), ops().stream().map(BoardOp::getTxId).toList());
        // broadcast chỉ mang dải seq của từng commit, không phải dải của tx đã merge
        assertEquals(List.of(1L, 2L, 3L), events.stream().map(BatchEvent::seqFrom).toList());
        assertEquals(List.of(1L, 2L, 3L), events.stream().map(BatchEvent::seqTo).toList());
        assertTrue(events.stream().allMatch(e -> r1.txId().equals(e.txId())));
        assertEquals(2, r2.seqFrom());
        assertEquals(2, r2.seqTo());

        clock.advance(Duration.ofMillis(3500));
        ElementWriter.CommitResult r4 = patch("u1", a.getId(), Map.of("text", "abcd"), key);
        assertNotEquals(r1.txId(), r4.txId(), "quá 3s thì tạo tx mới");
        ElementWriter.CommitResult r5 = patch("u2", a.getId(), Map.of("text", "x"), key);
        assertNotEquals(r4.txId(), r5.txId(), "chỉ merge vào tx của chính user");
        assertEquals(3, txs().size());
        assertEquals(5, counter().getCommittedSeq());
        assertEquals("x", live(a.getId()).getText());
        assertInvariant();
    }

    @Test
    void snapshotZeroPartialFailureRerunIsIdempotent() {
        BoardElement a = seed(element("shape"));
        // giả lập lần trước ghi xong snapshot 0 rồi chết trước khi tạo counter
        BoardSnapshot partial = new BoardSnapshot();
        partial.setBoardId(board);
        partial.setSeq(0);
        partial.setElements(new ArrayList<>(writer.loadBoard(board).values()));
        mongo.insert(partial);
        assertNull(counter());

        patch("u1", a.getId(), Map.of("x", 5), null);
        patch("u1", a.getId(), Map.of("x", 6), null);

        List<BoardSnapshot> snaps = snapshots();
        assertEquals(1, snaps.size(), "không tạo snapshot 0 thứ hai");
        assertEquals(partial.getId(), snaps.get(0).getId());
        assertTrue(ElementNormalizer.same(0.0, snaps.get(0).getElements().get(0).get("x")), "$setOnInsert không ghi đè");
        assertEquals(2, counter().getSeq());
        assertEquals(2, counter().getCommittedSeq());
        assertInvariant();
    }

    @Test
    void postCommitStateTransitions() {
        BoardElement a = seed(element("shape"));
        String t2 = seedTx("u1", "active");
        String t3 = seedTx("u1", "undone");
        String t4 = seedTx("u1", "undone");
        String t5 = seedTx("u2", "undone");
        List<Intent> move = List.of(Intent.patch(a.getId(), ElementNormalizer.normalizeSet(Map.of("x", 1))));

        ElementWriter.CommitResult u = writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "undo", move, null, t2));
        assertEquals("undone", tx(t2).getState(), "undo: target active -> undone");
        assertEquals("undone", tx(t4).getState(), "undo không giết redo");
        assertEquals("active", tx(u.txId()).getState());
        assertEquals(t2, tx(u.txId()).getTarget());

        writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "redo", move, null, t3));
        assertEquals("dead", tx(t3).getState(), "redo: target undone -> dead");
        assertEquals("undone", tx(t4).getState(), "redo không giết redo khác");

        ElementWriter.CommitResult u2 = writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "undo", move, null, t3));
        assertEquals("dead", tx(t3).getState(), "undo chỉ chuyển target khi target đang active");
        assertEquals("active", tx(u2.txId()).getState());

        writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "user", move, null, null));
        assertEquals("dead", tx(t4).getState(), "thao tác mới của user làm mất redo");
        assertEquals("dead", tx(t2).getState());
        assertEquals("undone", tx(t5).getState(), "không đụng tx của user khác");
        assertEquals(4, counter().getCommittedSeq());
    }

    @Test
    void commitWithOnlyMissingIdsIsEmptyAndDoesNotPublish() {
        seed(element("shape"));
        ElementWriter.CommitResult r = patch("u1", new ObjectId().toHexString(), Map.of("x", 1), null);
        assertTrue(r.isEmpty());
        assertSame(ElementWriter.CommitResult.EMPTY, r);
        assertEquals(0, counter().getSeq(), "không cấp seq");
        assertTrue(txs().isEmpty());
        assertTrue(ops().isEmpty());
        assertTrue(events.isEmpty());
    }

    @Test
    void commitInsideWithLockIsReentrant() {
        BoardElement a = seed(element("shape"));
        ElementWriter.CommitResult r = writer.withLock(board, () -> {
            assertEquals(0, writer.committedSeq(board));
            return patch("u1", a.getId(), Map.of("x", 3), null);
        });
        assertEquals(1, r.seqTo());
        assertEquals(1, writer.committedSeq(board));
        assertEquals(1, writer.opsOfTx(board, r.txId()).size());
    }

    @Test
    @SuppressWarnings("unchecked")
    void mixedBatchIsOrderedAndBroadcastAsOneEvent() {
        BoardElement a = seed(element("shape"));
        BoardElement b = seed(element("shape"));
        BoardElement fresh = element("shape");
        ElementWriter.CommitResult r = writer.commit(new ElementWriter.CommitRequest(board, "u1", "s1", "user", List.of(
                Intent.delete(b.getId()),
                Intent.patch(a.getId(), ElementNormalizer.normalizeSet(Map.of("x", 9))),
                Intent.create(ElementNormalizer.full(fresh))), null, null));

        assertEquals(1, r.seqFrom());
        assertEquals(3, r.seqTo());
        assertEquals(List.of("create", "patch", "delete"), ops().stream().map(BoardOp::getKind).toList());
        assertEquals(List.of(1L, 2L, 3L), writer.opsOfTx(board, r.txId()).stream().map(BoardOp::getSeq).toList());
        assertEquals(List.of(2L), writer.laterOps(board, a.getId(), 0).stream().map(BoardOp::getSeq).toList());
        assertTrue(writer.laterOps(board, a.getId(), 2).isEmpty());

        assertEquals(1, events.size());
        BatchEvent ev = events.get(0);
        assertEquals(r.txId(), ev.txId());
        assertEquals("user", ev.source());
        assertEquals(1, ev.seqFrom());
        assertEquals(3, ev.seqTo());
        assertEquals("s1", ev.senderSessionId());
        assertEquals("u1", ev.userId());
        assertEquals(List.of("create", "patch", "delete"), ev.ops().stream().map(o -> o.get("op")).toList());

        Map<String, Object> created = ((List<Map<String, Object>>) ev.ops().get(0).get("elements")).get(0);
        assertEquals(fresh.getId(), created.get("id"));
        assertEquals(1L, created.get("version"));
        Map<String, Long> fs = (Map<String, Long>) created.get("fieldSeq");
        assertFalse(fs.containsValue(CommitPlanner.SEQ), "sentinel SEQ phải được thay bằng seq thật");
        assertEquals(fs, live(fresh.getId()).getFieldSeq());

        Map<String, Object> patchEntry = ((List<Map<String, Object>>) ev.ops().get(1).get("patches")).get(0);
        assertEquals(a.getId(), patchEntry.get("id"));
        assertTrue(ElementNormalizer.same(9.0, ((Map<String, Object>) patchEntry.get("set")).get("x")));
        assertEquals(2L, patchEntry.get("version"));
        assertEquals(List.of(b.getId()), ev.ops().get(2).get("ids"));
        assertInvariant();
    }
}
