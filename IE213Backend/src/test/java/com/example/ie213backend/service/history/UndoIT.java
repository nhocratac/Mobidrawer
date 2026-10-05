package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.service.BoardService;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@EnabledIfEnvironmentVariable(named = "MONGO_IT_URI", matches = ".+")
class UndoIT {
    static final String CAROL = new ObjectId().toHexString();
    static final String ALICE = new ObjectId().toHexString();
    static final String BOB = new ObjectId().toHexString();

    MongoClient client;
    MongoTemplate mongo;
    ElementWriter writer;
    BoardService boardService;
    UndoService undo;
    final List<BatchEvent> events = new CopyOnWriteArrayList<>();
    String boardId;

    @BeforeEach
    void setUp() {
        client = MongoClients.create(System.getenv("MONGO_IT_URI"));
        mongo = new MongoTemplate(client, "it_" + UUID.randomUUID().toString().replace("-", ""));
        boardService = mock(BoardService.class);
        when(boardService.getRoleOfMember(anyString(), anyString())).thenReturn("EDITOR");
        writer = newWriter();
        undo = new UndoService(writer, mongo, boardService);
        boardId = new ObjectId().toHexString();
    }

    @AfterEach
    void tearDown() {
        mongo.getDb().drop();
        client.close();
    }

    // constructor của ElementWriter theo Task 6: (MongoTemplate, BoardLocks, BatchPublisher)
    private ElementWriter newWriter() {
        return new ElementWriter(mongo, new BoardLocks(), (b, ev) -> events.add(ev));
    }

    private Map<String, Object> shape(String id, double x) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setBoardId(boardId);
        e.setOwner(CAROL);
        e.setType("shape");
        e.setShape(new BoardElement.ShapeData("rect"));
        e.setX(x);
        e.setW(100);
        e.setH(80);
        e.setVersion(1L);
        return ElementNormalizer.full(e);
    }

    private Map<String, Object> connector(String id, String from, String to) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setBoardId(boardId);
        e.setOwner(CAROL);
        e.setType("connector");
        e.setConnector(new BoardElement.ConnectorData(new BoardElement.End(from, "auto"), new BoardElement.End(to, "auto")));
        e.setVersion(1L);
        return ElementNormalizer.full(e);
    }

    private ElementWriter.CommitResult commit(String userId, Intent... intents) {
        return writer.commit(new ElementWriter.CommitRequest(boardId, userId, "s-" + userId, "user",
                List.of(intents), null, null));
    }

    private ElementWriter.CommitResult setX(String userId, String id, double x) {
        return commit(userId, Intent.patch(id, ElementNormalizer.normalizeSet(Map.<String, Object>of("x", x))));
    }

    private HistoryResult undoAlice() {
        return undo.undo(boardId, ALICE, "s-alice");
    }

    private HistoryResult redoAlice() {
        return undo.redo(boardId, ALICE, "s-alice");
    }

    private BoardElement el(String id) {
        return mongo.findById(id, BoardElement.class);
    }

    private String state(String txId) {
        return mongo.findById(txId, BoardTx.class).getState();
    }

    private BoardTx redoOf(String targetTxId) {
        return mongo.findOne(Query.query(Criteria.where("source").is("redo").and("target").is(targetTxId)), BoardTx.class);
    }

    private long pendingCount() {
        return mongo.count(Query.query(Criteria.where("state").is("pending")), BoardTx.class);
    }

    // Mongo có thể trả Integer hoặc Long; thiếu key = 0 (§5.1)
    private static long num(Map<String, ?> m, String key) {
        Object v = m == null ? null : m.get(key);
        return v == null ? 0L : ((Number) v).longValue();
    }

    private long fsX(String id) {
        return num(el(id).getFieldSeq(), "x");
    }

    private long fsBeforeX(String txId) {
        return num(writer.opsOfTx(boardId, txId).get(0).getFsBefore(), "x");
    }

    private long fsAfterX(String txId) {
        List<BoardOp> ops = writer.opsOfTx(boardId, txId);
        return num(ops.get(ops.size() - 1).getFsAfter(), "x");
    }

    // §7.5 ví dụ 1
    @Test
    void example1_undoSkipsKeyModifiedByAnotherUserAndKillsT() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();
        commit(BOB, Intent.patch(s, ElementNormalizer.normalizeSet(
                Map.<String, Object>of("style", Map.<String, Object>of("fill", "#ff0000")))));
        setX(BOB, s, 200);
        int broadcastsBefore = events.size();

        HistoryResult r = undoAlice();

        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(s, "x", "modified", BOB)), r.skipped().toString());
        assertEquals("dead", state(t));
        assertEquals(200.0, el(s).getX());
        assertEquals(broadcastsBefore, events.size(), "không có inverse thì không commit, không broadcast");
        assertEquals(HistoryResult.empty("undo"), undoAlice());
    }

    // Ghi lại key không đổi giá trị (FE resize gửi cả x,y) không được tạo xung đột "modified" giả
    @Test
    void noOpKeyWriteByAnotherUserDoesNotBlockUndo() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();
        commit(BOB, Intent.patch(s, ElementNormalizer.normalizeSet(Map.<String, Object>of("x", 100.0, "w", 150.0))));

        HistoryResult r = undoAlice();

        assertTrue(r.skipped().isEmpty(), r.skipped().toString());
        assertEquals(1, r.applied());
        assertEquals(0.0, el(s).getX());
        assertEquals(150.0, el(s).getW(), "w của Bob không bị undo");
        assertEquals("undone", state(t));
    }

    // §7.5 ví dụ 2: một user undo/redo nhiều bước trên cùng key
    @Test
    void example2_multiStepUndoRedoByOneUser() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t1 = setX(ALICE, s, 100).txId();
        String t2 = setX(ALICE, s, 200).txId();
        long t1fsB = fsBeforeX(t1);
        long t1fsA = fsAfterX(t1);
        long t2fsA = fsAfterX(t2);
        assertEquals(t1fsA, fsBeforeX(t2));

        assertEquals(1, undoAlice().applied());          // undo T2
        assertEquals(100.0, el(s).getX());
        assertEquals(t1fsA, fsX(s));
        assertEquals("undone", state(t2));

        assertEquals(1, undoAlice().applied());          // undo T1
        assertEquals(0.0, el(s).getX());
        assertEquals(t1fsB, fsX(s));
        assertEquals("undone", state(t1));

        assertEquals(1, redoAlice().applied());          // redo LIFO: T1 trước
        assertEquals(100.0, el(s).getX());
        assertEquals(t1fsA, fsX(s));
        assertEquals("dead", state(t1));

        assertEquals(1, redoAlice().applied());          // redo T2
        assertEquals(200.0, el(s).getX());
        assertEquals(t2fsA, fsX(s));
        assertEquals("dead", state(t2));

        assertEquals(1, undoAlice().applied());          // undo R2
        assertEquals(100.0, el(s).getX());
        assertEquals(t1fsA, fsX(s));
        assertEquals("undone", redoOf(t2).getState());
    }

    // §7.5 ví dụ 2 biến thể: Bob ghi x sau khi Alice undo xong, redo bị chặn
    @Test
    void example2Variant_redoBlockedAfterAnotherUserWritesTheKey() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t1 = setX(ALICE, s, 100).txId();
        String t2 = setX(ALICE, s, 200).txId();
        assertEquals(1, undoAlice().applied());
        assertEquals(1, undoAlice().applied());
        setX(BOB, s, 50);

        HistoryResult r = redoAlice();

        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(s, "x", "modified", BOB)), r.skipped().toString());
        assertEquals("dead", state(t1));
        assertEquals(50.0, el(s).getX());

        assertEquals(0, redoAlice().applied());          // T2 cũng bị chặn vì dấu x là của Bob
        assertEquals("dead", state(t2));
        assertEquals(HistoryResult.empty("redo"), redoAlice());
    }

    // §7.5 ví dụ 6: undo, rồi thao tác mới (user), rồi redo -> empty (post-commit §6.6 giết tx undone)
    @Test
    void undoThenNewUserActionThenRedoIsEmpty() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        assertEquals(1, undoAlice().applied());
        assertEquals("undone", state(t));

        setX(ALICE, s, 50);

        assertEquals("dead", state(t));
        assertEquals(HistoryResult.empty("redo"), redoAlice());
        assertEquals(50.0, el(s).getX());
    }

    // §7.5 ví dụ 6 biến thể restore, ở mức writer: commit(source="restore") của cùng user cũng giết tx undone.
    // Biến thể đầy đủ qua HistoryService.restore (OWNER) nằm trong HistoryIT của Task 9.
    @Test
    void undoThenRestoreCommitThenRedoIsEmpty() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        assertEquals(1, undoAlice().applied());
        assertEquals("undone", state(t));

        writer.commit(new ElementWriter.CommitRequest(boardId, ALICE, "s-alice", "restore",
                List.of(Intent.patch(s, ElementNormalizer.normalizeSet(Map.<String, Object>of("x", 30.0)))),
                null, null));

        assertEquals("dead", state(t));
        assertEquals(HistoryResult.empty("redo"), redoAlice());
        assertEquals(30.0, el(s).getX());
    }

    @Test
    void undoFailingAfterWalIsRolledForwardByTheNextCommitAndCanBeRedone() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        writer.afterWalHook = () -> {
            throw new IllegalStateException("injected failure after WAL");
        };
        assertThrows(RuntimeException.class, this::undoAlice);
        writer.afterWalHook = () -> {
        };
        assertEquals(1, pendingCount());
        assertEquals("active", state(t), "post-commit chưa chạy nên T vẫn active");

        commit(BOB, Intent.create(shape(new ObjectId().toHexString(), 500)));   // withLock kế tiếp roll-forward

        assertEquals(0, pendingCount());
        assertEquals("undone", state(t));
        assertEquals(0.0, el(s).getX());

        assertEquals(1, redoAlice().applied());
        assertEquals(100.0, el(s).getX());
        assertEquals("dead", state(t));
    }

    @Test
    void undoRedoUndoCycle() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        assertEquals(1, undoAlice().applied());
        assertEquals(0.0, el(s).getX());
        assertEquals("undone", state(t));

        assertEquals(1, redoAlice().applied());
        assertEquals(100.0, el(s).getX());
        assertEquals("dead", state(t));
        BoardTx r = redoOf(t);
        assertEquals("active", r.getState());

        assertEquals(1, undoAlice().applied());          // undo tx redo R
        assertEquals(0.0, el(s).getX());
        assertEquals("undone", state(r.getId()));

        assertEquals(1, redoAlice().applied());
        assertEquals(100.0, el(s).getX());
        assertEquals("dead", state(r.getId()));
        assertEquals(0, pendingCount());
    }

    @Test
    void undoDeleteOfShapeWithConnectorRecreatesBoth() {
        String a = new ObjectId().toHexString();
        String b = new ObjectId().toHexString();
        String c = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(a, 0)), Intent.create(shape(b, 300)), Intent.create(connector(c, a, b)));
        long aVersion = el(a).getVersion();

        ElementWriter.CommitResult del = commit(ALICE, Intent.delete(a));
        assertEquals(Set.of(a, c), del.ops().stream().map(BoardOp::getElementId).collect(Collectors.toSet()));
        assertNull(el(a));
        assertNull(el(c));

        HistoryResult r = undoAlice();

        assertEquals(new HistoryResult("undo", 2, List.of()), r);
        assertNotNull(el(a));
        assertEquals(0.0, el(a).getX());
        assertTrue(el(a).getVersion() > aVersion, "version không bao giờ giảm");
        BoardElement conn = el(c);
        assertNotNull(conn);
        assertEquals(a, conn.getConnector().getFrom().getElementId());
        assertEquals(b, conn.getConnector().getTo().getElementId());
        assertEquals("undone", state(del.txId()));

        BatchEvent last = events.get(events.size() - 1);
        assertEquals("undo", last.source());
        assertEquals("s-alice", last.senderSessionId());
        Set<Object> created = new HashSet<>();
        last.ops().stream().filter(o -> "create".equals(o.get("op")))
                .forEach(o -> ((List<?>) o.get("elements")).forEach(e -> created.add(((Map<?, ?>) e).get("id"))));
        assertEquals(Set.of(a, c), created);

        assertEquals(2, redoAlice().applied());
        assertNull(el(a));
        assertNull(el(c));
        assertNotNull(el(b));
    }

    // Review Focus 2 ở mức IT: writer + service mới (như restart / reload), chỉ còn state trong Mongo
    @Test
    void undoWorksFromFreshWriterAndServiceInstances() {
        String s = new ObjectId().toHexString();
        commit(CAROL, Intent.create(shape(s, 0)));
        String t = setX(ALICE, s, 100).txId();

        UndoService fresh = new UndoService(newWriter(), mongo, boardService);

        assertEquals(1, fresh.undo(boardId, ALICE, "s-alice-2").applied());
        assertEquals(0.0, el(s).getX());
        assertEquals("undone", state(t));
    }
}
