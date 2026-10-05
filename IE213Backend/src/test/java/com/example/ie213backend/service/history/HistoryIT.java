package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
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

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

// Chạy với Mongo local: MONGO_IT_URI=mongodb://localhost:27027 (spec §12.3)
@EnabledIfEnvironmentVariable(named = "MONGO_IT_URI", matches = ".+")
class HistoryIT {
    static final String OWNER = "650000000000000000000a01";
    static final String BOB = "650000000000000000000a02";
    static final List<String> COMPARED = Stream.concat(Stream.of("type", "image"), ElementKeys.K.stream()).toList();

    final String boardId = new ObjectId().toHexString();
    final List<BatchEvent> events = new CopyOnWriteArrayList<>();

    MongoClient client;
    MongoTemplate mongo;
    ElementWriter writer;
    SnapshotJob snapshots;
    UndoService undo;
    HistoryService history;

    @BeforeEach
    void setUp() {
        client = MongoClients.create(System.getenv("MONGO_IT_URI"));
        mongo = new MongoTemplate(client, "it_" + UUID.randomUUID().toString().replace("-", ""));
        // MongoTemplate dựng tay không tự tạo index: cần unique để trùng seq / trùng snapshot là lỗi thật
        mongo.indexOps(BoardOp.class).ensureIndex(new Index().on("boardId", Sort.Direction.ASC)
                .on("seq", Sort.Direction.ASC).unique());
        mongo.indexOps(BoardSnapshot.class).ensureIndex(new Index().on("boardId", Sort.Direction.ASC)
                .on("seq", Sort.Direction.ASC).unique());

        BoardService boardService = mock(BoardService.class);
        when(boardService.getRoleOfMember(eq(boardId), anyString())).thenReturn("EDITOR");
        when(boardService.getRoleOfMember(boardId, OWNER)).thenReturn("OWNER");
        UserRepository users = mock(UserRepository.class);
        when(users.findAllById(any())).thenReturn(List.of(user(OWNER, "Owner", "Test"), user(BOB, "Bob", null)));

        writer = new ElementWriter(mongo, new BoardLocks(), (b, ev) -> events.add(ev));
        snapshots = new SnapshotJob(mongo);
        writer.setSnapshotJob(snapshots);
        undo = new UndoService(writer, mongo, boardService);
        history = new HistoryService(writer, snapshots, boardService, users, mongo);
    }

    @AfterEach
    void tearDown() {
        // chờ job snapshot xong rồi mới drop DB
        snapshots.shutdown();
        mongo.getDb().drop();
        client.close();
    }

    // ---- helpers ----

    private static User user(String id, String first, String last) {
        User u = new User();
        u.setId(id);
        u.setFirstName(first);
        u.setLastName(last);
        return u;
    }

    private static String oid() {
        return new ObjectId().toHexString();
    }

    private BoardElement base(String id, String type) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setType(type);
        e.setBoardId(boardId);
        e.setOwner(OWNER);
        e.setW(200);
        e.setH(120);
        e.setZ(1);
        e.setVersion(1L);
        return e;
    }

    private BoardElement sticky(String id, double x) {
        BoardElement e = base(id, "sticky");
        e.setX(x);
        e.setText("note " + id.substring(18));
        return e;
    }

    private BoardElement image(String id) {
        BoardElement e = base(id, "image");
        e.setImage(new BoardElement.ImageData("https://img.example/p.png", "cld-1", "ảnh"));
        return e;
    }

    private BoardElement connector(String id, String from, String to) {
        BoardElement e = base(id, "connector");
        e.setConnector(new BoardElement.ConnectorData(new BoardElement.End(from, "auto"), new BoardElement.End(to, "auto")));
        return e;
    }

    private static Map<String, Object> ends(String from, String to) {
        return Map.of("from", Map.of("elementId", from, "anchor", "auto"), "to", Map.of("elementId", to, "anchor", "auto"));
    }

    private static Intent create(BoardElement e) {
        return Intent.create(ElementNormalizer.full(e));
    }

    private static Intent patch(String id, String key, Object value) {
        return Intent.patch(id, ElementNormalizer.normalizeSet(Map.of(key, value)));
    }

    private ElementWriter.CommitResult commit(String userId, Intent... intents) {
        ElementWriter.CommitResult r = writer.commit(new ElementWriter.CommitRequest(
                boardId, userId, "s-" + userId, "user", List.of(intents), null, null));
        assertFalse(r.isEmpty(), "commit không được rỗng");
        return r;
    }

    private long committed() {
        return writer.committedSeq(boardId);
    }

    // So trên id, type, image và K (đã chuẩn hóa)
    private static void assertSameBoard(Map<String, Map<String, Object>> expected, Map<String, Map<String, Object>> actual) {
        assertEquals(expected.keySet(), actual.keySet(), "tập id khác nhau");
        for (String id : expected.keySet())
            for (String k : COMPARED)
                assertTrue(ElementNormalizer.same(expected.get(id).get(k), actual.get(id).get(k)),
                        id + "." + k + ": " + expected.get(id).get(k) + " != " + actual.get(id).get(k));
    }

    // So toàn bộ map (gồm fieldSeq, version)
    private static void assertSameFull(Map<String, Map<String, Object>> expected, Map<String, Map<String, Object>> actual) {
        assertEquals(expected.keySet(), actual.keySet(), "tập id khác nhau");
        for (String id : expected.keySet())
            assertTrue(ElementNormalizer.same(expected.get(id), actual.get(id)),
                    id + ": " + expected.get(id) + " != " + actual.get(id));
    }

    // Invariant §8.2: stateMap(committedSeq) == boardElements
    private void assertInvariant() {
        assertSameBoard(history.stateMap(boardId, committed()), writer.loadBoard(boardId));
    }

    private Query snapQuery(long seq) {
        return Query.query(Criteria.where("boardId").is(new ObjectId(boardId)).and("seq").is(seq));
    }

    private BoardSnapshot awaitSnapshot(long seq) throws InterruptedException {
        for (int i = 0; i < 50; i++) {
            BoardSnapshot s = mongo.findOne(snapQuery(seq), BoardSnapshot.class);
            if (s != null) return s;
            Thread.sleep(100);
        }
        return null;
    }

    // Replay từ snapshot 0 qua mọi op <= n (không dùng snapshot trung gian)
    private Map<String, Map<String, Object>> replayFromZero(long n) {
        BoardSnapshot s0 = mongo.findOne(snapQuery(0), BoardSnapshot.class);
        assertNotNull(s0, "phải có snapshot 0");
        Map<String, Map<String, Object>> base = new LinkedHashMap<>();
        s0.getElements().forEach(e -> base.put((String) e.get("id"), e));
        List<BoardOp> ops = mongo.find(Query.query(Criteria.where("boardId").is(new ObjectId(boardId))
                .and("seq").lte(n)).with(Sort.by(Sort.Direction.ASC, "seq")), BoardOp.class);
        return HistoryMath.replay(base, ops);
    }

    @SuppressWarnings("unchecked")
    private static List<String> endsOf(Map<String, Object> connectorElement) {
        return ElementKeys.connectorEnds((Map<String, Object>) connectorElement.get("connector"));
    }

    // ---- tests ----

    @Test
    void restoreToEarlierSeqThenUndoRestoreReturnsToPreRestoreState() {
        String a = oid(), b = oid(), c = oid();
        commit(OWNER, create(sticky(a, 0)));
        commit(OWNER, create(sticky(b, 50)));
        long checkpoint = committed();
        Map<String, Map<String, Object>> atCheckpoint = writer.loadBoard(boardId);
        commit(BOB, patch(a, "x", 300));
        commit(OWNER, Intent.delete(b));
        commit(BOB, create(sticky(c, 10)));
        assertInvariant();
        assertEquals(Set.of(a, b), history.stateAt(boardId, BOB, checkpoint).elements().stream()
                .map(e -> (String) e.get("id")).collect(java.util.stream.Collectors.toSet()));
        Map<String, Map<String, Object>> preRestore = writer.loadBoard(boardId);
        events.clear();

        HistoryResult r = history.restore(boardId, OWNER, "s-owner", checkpoint);

        // patch a.x + create b + delete c
        assertEquals(new HistoryResult("restore", 3, List.of()), r);
        assertSameBoard(atCheckpoint, writer.loadBoard(boardId));
        assertInvariant();
        assertEquals(1, events.size(), "restore là một batch");
        assertEquals("restore", events.get(0).source());
        assertEquals(3, events.get(0).seqTo() - events.get(0).seqFrom() + 1);
        HistoryService.TxView newest = history.list(boardId, BOB, null, 30).get(0);
        assertEquals("restore", newest.source());
        assertEquals("Owner Test", newest.userName());
        assertEquals(committed(), newest.seqTo());

        HistoryResult u = undo.undo(boardId, OWNER, "s-owner");

        assertEquals("undo", u.op());
        assertTrue(u.applied() > 0, "undo restore phải áp dụng được");
        assertTrue(u.skipped().isEmpty(), "không có xung đột: " + u.skipped());
        assertSameBoard(preRestore, writer.loadBoard(boardId));
        assertInvariant();
    }

    @Test
    void restoreToSeqZeroOnMigratedBoardSeededWithoutCounter() {
        String a = oid(), p = oid(), n = oid();
        // element legacy/migrate: ghi thẳng, không fieldSeq, chưa có boardCounters
        BoardElement legacy = sticky(a, 5);
        legacy.setVersion(3L);
        legacy.setMigratedFrom("stickyNote");
        BoardElement pic = image(p);
        pic.setVersion(2L);
        pic.setMigratedFrom("Images");
        mongo.insert(legacy);
        mongo.insert(pic);
        assertNull(mongo.findOne(Query.query(Criteria.where("_id").is(new ObjectId(boardId))), BoardCounter.class));
        Map<String, Map<String, Object>> seeded = writer.loadBoard(boardId);

        // chưa commit lần nào: seq 0 == trạng thái hiện tại
        assertEquals(HistoryResult.empty("restore"), history.restore(boardId, OWNER, "s-owner", 0));
        assertSameBoard(seeded, history.stateMap(boardId, 0));

        commit(OWNER, patch(a, "x", 400));
        commit(BOB, Intent.delete(p));
        commit(OWNER, create(sticky(n, 0)));
        BoardSnapshot s0 = mongo.findOne(snapQuery(0), BoardSnapshot.class);
        assertNotNull(s0, "commit đầu tiên phải tạo snapshot 0");
        assertEquals(2, s0.getElements().size());
        Map<String, Map<String, Object>> preRestore = writer.loadBoard(boardId);

        HistoryResult r = history.restore(boardId, OWNER, "s-owner", 0);

        // patch a.x + create p + delete n
        assertEquals(new HistoryResult("restore", 3, List.of()), r);
        Map<String, Map<String, Object>> after = writer.loadBoard(boardId);
        assertSameBoard(seeded, after);
        assertTrue(ElementNormalizer.same(seeded.get(p).get("image"), after.get(p).get("image")), "image giữ nguyên");
        assertTrue(((Number) after.get(p).get("version")).longValue() > 2L, "version không giảm khi tạo lại");
        assertInvariant();

        // restore trên board migrate cũng undo được
        HistoryResult u = undo.undo(boardId, OWNER, "s-owner");
        assertTrue(u.applied() > 0);
        assertTrue(u.skipped().isEmpty(), "không có xung đột: " + u.skipped());
        assertSameBoard(preRestore, writer.loadBoard(boardId));
        assertInvariant();
    }

    @Test
    void snapshotAt200MatchesReplayFromZero() throws InterruptedException {
        String a = oid();
        commit(OWNER, create(sticky(a, 0)));
        for (int i = 1; i < 200; i++) commit(i % 2 == 0 ? OWNER : BOB, patch(a, "x", i));
        assertEquals(200, committed());

        // job do ElementWriter gọi sau broadcast, không gọi build ở đây
        BoardSnapshot auto = awaitSnapshot(200);
        assertNotNull(auto, "maybeSnapshot không chạy khi seq vượt 200");
        BoardSnapshot again = snapshots.build(boardId, 200);
        assertEquals(auto.getId(), again.getId(), "build lại trả snapshot đã có");
        assertEquals(1, mongo.count(snapQuery(200), BoardSnapshot.class));

        for (int i = 0; i < 10; i++) commit(BOB, patch(a, "y", i));
        assertEquals(210, committed());
        assertNull(mongo.findOne(snapQuery(400), BoardSnapshot.class));

        for (long n : new long[]{150, 199, 200, 205, 210})
            assertSameFull(replayFromZero(n), history.stateMap(boardId, n));
        assertSameFull(replayFromZero(200), toMap(again.getElements()));
        assertInvariant();
    }

    @Test
    void restoreRepointedConnectorAndDeletedEnd() {
        String e = oid(), f = oid(), g = oid(), c = oid();
        commit(OWNER, create(sticky(e, 0)), create(sticky(f, 300)), create(sticky(g, 600)), create(connector(c, e, f)));
        long s1 = committed();
        commit(OWNER, patch(c, "connector", ends(e, g)));
        commit(BOB, Intent.delete(f));
        long s3 = committed();
        assertTrue(writer.loadBoard(boardId).containsKey(c), "C đã trỏ sang G nên không bị cascade");

        // về s1: tạo lại F, C trỏ lại E→F (F tạo trước patch nên đầu hợp lệ)
        assertEquals(new HistoryResult("restore", 2, List.of()), history.restore(boardId, OWNER, "s-owner", s1));
        Map<String, Map<String, Object>> b1 = writer.loadBoard(boardId);
        assertEquals(Set.of(e, f, g, c), b1.keySet());
        assertEquals(List.of(e, f), endsOf(b1.get(c)));
        assertInvariant();

        // về s3: xóa F + patch C→G; cascade tính sau patch nên C còn
        assertEquals(new HistoryResult("restore", 2, List.of()), history.restore(boardId, OWNER, "s-owner", s3));
        Map<String, Map<String, Object>> b2 = writer.loadBoard(boardId);
        assertEquals(Set.of(e, g, c), b2.keySet());
        assertEquals(List.of(e, g), endsOf(b2.get(c)));
        assertInvariant();

        // Bob xóa G (cascade C); về s3 thì tạo lại G rồi mới tới C
        commit(BOB, Intent.delete(g));
        assertEquals(Set.of(e), writer.loadBoard(boardId).keySet(), "xóa G phải cascade C");
        restoreAndCheck(s3, 2);
        Map<String, Map<String, Object>> b3 = writer.loadBoard(boardId);
        assertEquals(Set.of(e, g, c), b3.keySet());
        assertEquals(List.of(e, g), endsOf(b3.get(c)));
        assertInvariant();
    }

    // §7.5 ví dụ 6 biến thể restore: restore ghi tx mới nên redo của tx đã undo bị vô hiệu
    @Test
    void redoAfterUndoThenRestoreIsEmpty() {
        String a = oid(), b = oid();
        commit(OWNER, create(sticky(a, 0)));
        long checkpoint = committed();
        commit(OWNER, create(sticky(b, 50)));
        commit(OWNER, patch(a, "x", 100));
        HistoryResult u = undo.undo(boardId, OWNER, "s-owner");
        assertEquals(1, u.applied());

        HistoryResult r = history.restore(boardId, OWNER, "s-owner", checkpoint);

        assertEquals(new HistoryResult("restore", 1, List.of()), r);
        assertEquals(Set.of(a), writer.loadBoard(boardId).keySet());
        assertEquals(HistoryResult.empty("redo"), undo.redo(boardId, OWNER, "s-owner"));
        assertInvariant();
    }

    // Review Focus 5: element đổi image (delete+create cùng id trong một batch) rồi restore về seq cũ
    @Test
    void restoreAcrossImageChangeRecreatesElementWithTargetImage() {
        String p = oid(), a = oid();
        commit(OWNER, create(image(p)), create(sticky(a, 0)));
        long s1 = committed();
        BoardElement changed = image(p);
        changed.setImage(new BoardElement.ImageData("https://img.example/other.png", "cld-2", "khác"));
        commit(BOB, Intent.delete(p), create(changed));
        assertEquals("https://img.example/other.png", ((Map<?, ?>) writer.loadBoard(boardId).get(p).get("image")).get("url"));
        Map<String, Map<String, Object>> target = history.stateMap(boardId, s1);

        HistoryResult r = history.restore(boardId, OWNER, "s-owner", s1);

        assertEquals("restore", r.op());
        assertTrue(r.applied() > 0);
        Map<String, Map<String, Object>> after = writer.loadBoard(boardId);
        assertEquals(Set.of(p, a), after.keySet());
        assertEquals("https://img.example/p.png", ((Map<?, ?>) after.get(p).get("image")).get("url"));
        assertSameBoard(target, after);
        assertInvariant();
    }

    private void restoreAndCheck(long seq, int applied) {
        HistoryResult r = history.restore(boardId, OWNER, "s-owner", seq);
        assertEquals("restore", r.op());
        assertEquals(applied, r.applied());
        assertTrue(r.skipped().isEmpty());
    }

    private static Map<String, Map<String, Object>> toMap(List<Map<String, Object>> elements) {
        Map<String, Map<String, Object>> m = new LinkedHashMap<>();
        new ArrayList<>(elements).forEach(el -> m.put((String) el.get("id"), el));
        return m;
    }
}
