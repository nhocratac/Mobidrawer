package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.service.BoardService;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UndoServiceTest {
    static final String B = "b";
    static final String ALICE = "alice";
    static final String BOB = "bob";
    static final String SID = "s1";
    static final String E = "650000000000000000000001";

    @Mock
    ElementWriter writer;
    @Mock
    MongoTemplate mongo;
    @Mock
    BoardService boardService;
    @InjectMocks
    UndoService service;

    private static BoardTx tx(String id, String source, String state, long seqTo, String target) {
        BoardTx t = new BoardTx();
        t.setId(id);
        t.setBoardId(B);
        t.setUserId(ALICE);
        t.setSource(source);
        t.setState(state);
        t.setSeqFrom(seqTo);
        t.setSeqTo(seqTo);
        t.setTarget(target);
        return t;
    }

    private static BoardOp patchX(long seq, String txId, String userId, double xBefore, double xAfter, long fsBefore, long fsAfter) {
        BoardOp o = new BoardOp();
        o.setSeq(seq);
        o.setTxId(txId);
        o.setUserId(userId);
        o.setKind("patch");
        o.setElementId(E);
        o.setBefore(new HashMap<>(Map.of("x", xBefore)));
        o.setAfter(new HashMap<>(Map.of("x", xAfter)));
        o.setFsBefore(new HashMap<>(Map.of("x", fsBefore)));
        o.setFsAfter(new HashMap<>(Map.of("x", fsAfter)));
        o.setV(seq);
        return o;
    }

    private static Map<String, Map<String, Object>> boardWith(double x, long fsX) {
        BoardElement e = new BoardElement();
        e.setId(E);
        e.setBoardId(B);
        e.setType("shape");
        e.setShape(new BoardElement.ShapeData("rect"));
        e.setX(x);
        e.setW(100);
        e.setH(80);
        e.setVersion(5L);
        e.setFieldSeq(new HashMap<>(Map.of("x", fsX)));
        Map<String, Map<String, Object>> board = new HashMap<>();
        board.put(E, ElementNormalizer.full(e));
        return board;
    }

    private void editor() {
        when(boardService.getRoleOfMember(B, ALICE)).thenReturn("EDITOR");
    }

    @SuppressWarnings("unchecked")
    private void lockRunsInline() {
        when(writer.withLock(eq(B), any(Supplier.class))).thenAnswer(inv -> ((Supplier<Object>) inv.getArgument(1)).get());
    }

    // phân biệt 3 query trên boardTxs theo criteria; doAnswer để stub lại được trong cùng test
    private void txQueries(List<BoardTx> undoStack, List<BoardTx> undone, List<BoardTx> undos) {
        doAnswer(inv -> {
            Document q = inv.<Query>getArgument(0).getQueryObject();
            if ("undone".equals(q.get("state"))) return undone;
            if ("undo".equals(q.get("source"))) return undos;
            return undoStack;
        }).when(mongo).find(any(Query.class), eq(BoardTx.class));
    }

    private void laterOps(List<BoardOp> later) {
        lenient().when(writer.laterOps(eq(B), eq(E), anyLong())).thenReturn(later);
    }

    private ElementWriter.CommitRequest capturedCommit() {
        ArgumentCaptor<ElementWriter.CommitRequest> c = ArgumentCaptor.forClass(ElementWriter.CommitRequest.class);
        verify(writer).commit(c.capture());
        return c.getValue();
    }

    private void assertMarkedDead(String txId, String fromState) {
        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> u = ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateFirst(q.capture(), u.capture(), eq(BoardTx.class));
        assertEquals(txId, q.getValue().getQueryObject().get("_id"));
        assertEquals(fromState, q.getValue().getQueryObject().get("state"));
        assertEquals("dead", ((Document) u.getValue().getUpdateObject().get("$set")).get("state"));
    }

    @Test
    void undoPicksNewestActiveTxAndCommitsItsInverse() {
        editor();
        lockRunsInline();
        txQueries(List.of(tx("t3", "user", "undone", 30, null), tx("t2", "redo", "dead", 20, "t0"),
                tx("t1", "user", "active", 10, null)), List.of(), List.of());
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.loadBoard(B)).thenReturn(boardWith(100, 10));
        laterOps(List.of());
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("u1", 31, 31, List.of(new BoardOp())));

        HistoryResult r = service.undo(B, ALICE, SID);

        assertEquals(new HistoryResult("undo", 1, List.of()), r);
        ElementWriter.CommitRequest req = capturedCommit();
        assertEquals(B, req.boardId());
        assertEquals(ALICE, req.userId());
        assertEquals(SID, req.sessionId());
        assertEquals("undo", req.source());
        assertEquals("t1", req.target());
        assertNull(req.mergeKey());
        assertEquals(1, req.intents().size());
        Intent i = req.intents().get(0);
        assertEquals("patch", i.kind());
        assertEquals(E, i.elementId());
        assertTrue(ElementNormalizer.same(0.0, i.set().get("x")), String.valueOf(i.set()));
        assertEquals(0L, i.fsOverride().get("x"));
        verify(mongo, never()).updateFirst(any(Query.class), any(Update.class), eq(BoardTx.class));
    }

    @Test
    void undoStackIsThe50NewestUndoableTxsAndAfter50UndosIsEmpty() {
        editor();
        lockRunsInline();
        List<BoardTx> fiftyUndone = new ArrayList<>();
        for (int k = 50; k >= 1; k--) fiftyUndone.add(tx("t" + k, "user", "undone", k, null));
        txQueries(fiftyUndone, List.of(), List.of());

        assertEquals(HistoryResult.empty("undo"), service.undo(B, ALICE, SID));

        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(q.capture(), eq(BoardTx.class));
        Query stack = q.getValue();
        assertEquals(50, stack.getLimit());
        assertEquals(new Document("seqTo", -1), stack.getSortObject());
        Document crit = stack.getQueryObject();
        assertEquals(B, crit.get("boardId"));
        assertEquals(ALICE, crit.get("userId"));
        assertEquals(List.of("user", "redo", "restore"),
                new ArrayList<>((Collection<?>) ((Document) crit.get("source")).get("$in")));
        assertNull(crit.get("state"), "cap 50 tính trên mọi state");
        verify(writer, never()).commit(any());
        verify(writer, never()).opsOfTx(anyString(), anyString());
    }

    @Test
    void undoWithNoTxIsEmpty() {
        editor();
        lockRunsInline();
        txQueries(List.of(), List.of(), List.of());
        assertEquals(HistoryResult.empty("undo"), service.undo(B, ALICE, SID));
        verify(writer, never()).commit(any());
    }

    // §7.5 ví dụ 1: Bob đã ghi x sau T nên T không còn inverse, T chuyển dead
    @Test
    void undoMarksTDeadWhenTheKeyWasModifiedByAnotherUser() {
        editor();
        lockRunsInline();
        txQueries(List.of(tx("t1", "user", "active", 10, null)), List.of(), List.of());
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.loadBoard(B)).thenReturn(boardWith(200, 12));
        laterOps(List.of(patchX(12, "tb", BOB, 100, 200, 10, 12)));

        HistoryResult r = service.undo(B, ALICE, SID);

        assertEquals("undo", r.op());
        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(E, "x", "modified", BOB)), r.skipped().toString());
        verify(writer, never()).commit(any());
        assertMarkedDead("t1", "active");
    }

    @Test
    void undoTreatsPlannerRejectionAsNoInverse() {
        editor();
        lockRunsInline();
        txQueries(List.of(tx("t1", "user", "active", 10, null)), List.of(), List.of());
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.loadBoard(B)).thenReturn(boardWith(100, 10));
        laterOps(List.of());
        when(writer.commit(any())).thenThrow(new IllegalArgumentException("connector end not found on this board"));

        HistoryResult r = service.undo(B, ALICE, SID);

        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(null, null, "end-missing", null)), r.skipped().toString());
        assertMarkedDead("t1", "active");
    }

    @Test
    void viewerAndNonMemberCannotUndoOrRedo() {
        when(boardService.getRoleOfMember(B, "viewer")).thenReturn("VIEWER");
        when(boardService.getRoleOfMember(B, "stranger")).thenReturn("NONE");
        for (String user : List.of("viewer", "stranger")) {
            ResponseStatusException undo = assertThrows(ResponseStatusException.class, () -> service.undo(B, user, SID));
            ResponseStatusException redo = assertThrows(ResponseStatusException.class, () -> service.redo(B, user, SID));
            assertEquals(HttpStatus.FORBIDDEN, undo.getStatusCode());
            assertEquals(HttpStatus.FORBIDDEN, redo.getStatusCode());
        }
        verifyNoInteractions(writer, mongo);
    }

    // Review Focus 2: reload trang / reconnect STOMP = service mới, stack đọc lại từ boardTxs
    @Test
    void freshServiceInstanceOverSameStateStillFindsT() {
        editor();
        lockRunsInline();
        txQueries(List.of(tx("t1", "user", "active", 10, null)), List.of(), List.of());
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.loadBoard(B)).thenReturn(boardWith(100, 10));
        laterOps(List.of());
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("u1", 11, 11, List.of(new BoardOp())));

        UndoService fresh = new UndoService(writer, mongo, boardService);
        assertEquals(1, fresh.undo(B, ALICE, SID).applied());
        assertEquals("t1", capturedCommit().target());
        for (Field f : UndoService.class.getDeclaredFields())
            if (!Modifier.isStatic(f.getModifiers()))
                assertTrue(Modifier.isFinal(f.getModifiers()), "UndoService không được giữ state: " + f.getName());
    }

    @Test
    void redoReappliesTargetOfNewestUndoWhoseTargetIsUndone() {
        editor();
        lockRunsInline();
        txQueries(List.of(), List.of(tx("t1", "user", "undone", 10, null)),
                List.of(tx("u2", "undo", "active", 40, "t9"), tx("u1", "undo", "active", 30, "t1")));
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.opsOfTx(B, "u1")).thenReturn(List.of(patchX(30, "u1", ALICE, 100, 0, 10, 0)));
        when(writer.loadBoard(B)).thenReturn(boardWith(0, 0));
        laterOps(List.of());
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("r1", 41, 41, List.of(new BoardOp())));

        HistoryResult r = service.redo(B, ALICE, SID);

        assertEquals(new HistoryResult("redo", 1, List.of()), r);
        ElementWriter.CommitRequest req = capturedCommit();
        assertEquals("redo", req.source());
        assertEquals("t1", req.target());
        Intent i = req.intents().get(0);
        assertEquals("patch", i.kind());
        assertTrue(ElementNormalizer.same(100.0, i.set().get("x")), String.valueOf(i.set()));
        assertEquals(10L, i.fsOverride().get("x"));
    }

    @Test
    void redoIsEmptyWhenNoUndoTargetsAnUndoneTx() {
        editor();
        lockRunsInline();
        txQueries(List.of(), List.of(), List.of(tx("u1", "undo", "active", 30, "t1")));
        assertEquals(HistoryResult.empty("redo"), service.redo(B, ALICE, SID));

        txQueries(List.of(), List.of(tx("t1", "user", "undone", 10, null)), List.of(tx("u1", "undo", "active", 30, "t5")));
        assertEquals(HistoryResult.empty("redo"), service.redo(B, ALICE, SID));
        verify(writer, never()).commit(any());
    }

    // §7.5 ví dụ 2 biến thể: Bob ghi x sau khi Alice undo, redo bị chặn và T chuyển dead
    @Test
    void redoMarksTDeadWhenAnotherUserWroteTheKeyAfterTheUndo() {
        editor();
        lockRunsInline();
        txQueries(List.of(), List.of(tx("t1", "user", "undone", 10, null)), List.of(tx("u1", "undo", "active", 30, "t1")));
        when(writer.opsOfTx(B, "t1")).thenReturn(List.of(patchX(10, "t1", ALICE, 0, 100, 0, 10)));
        when(writer.opsOfTx(B, "u1")).thenReturn(List.of(patchX(30, "u1", ALICE, 100, 0, 10, 0)));
        when(writer.loadBoard(B)).thenReturn(boardWith(50, 35));
        laterOps(List.of(patchX(35, "tb", BOB, 0, 50, 0, 35)));

        HistoryResult r = service.redo(B, ALICE, SID);

        assertEquals("redo", r.op());
        assertEquals(0, r.applied());
        assertTrue(r.skipped().contains(new HistoryResult.Skip(E, "x", "modified", BOB)), r.skipped().toString());
        verify(writer, never()).commit(any());
        assertMarkedDead("t1", "undone");
    }
}
