package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class HistoryServiceTest {
    static final String B = "650000000000000000000009";

    @Mock
    ElementWriter writer;
    @Mock
    SnapshotJob snapshotJob;
    @Mock
    BoardService boardService;
    @Mock
    UserRepository userRepository;
    @Mock
    MongoTemplate mongo;
    @InjectMocks
    HistoryService service;

    private static Map<String, Object> el(String id, double x, double z) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", "sticky");
        m.put("image", null);
        m.put("x", x);
        m.put("z", z);
        return m;
    }

    private static BoardTx tx(String id, String userId, long seqTo) {
        BoardTx t = new BoardTx();
        t.setId(id);
        t.setUserId(userId);
        t.setTs(Instant.parse("2026-09-25T08:00:00Z"));
        t.setSource("user");
        t.setState("active");
        t.setSeqTo(seqTo);
        t.setSummary(new BoardTx.Summary(0, 1, 0));
        return t;
    }

    private static User user(String id, String first, String last) {
        User u = new User();
        u.setId(id);
        u.setFirstName(first);
        u.setLastName(last);
        return u;
    }

    private void lockRunsInline() {
        when(writer.withLock(eq(B), any())).thenAnswer(inv -> ((Supplier<?>) inv.getArgument(1)).get());
    }

    private static int status(ResponseStatusException e) {
        return e.getStatusCode().value();
    }

    @Test
    void nonMemberGets403OnListAndStateAt() {
        when(boardService.getRoleOfMember(B, "x")).thenReturn("NONE");
        assertEquals(403, status(assertThrows(ResponseStatusException.class, () -> service.list(B, "x", null, 30))));
        assertEquals(403, status(assertThrows(ResponseStatusException.class, () -> service.stateAt(B, "x", 0))));
        verifyNoInteractions(mongo, writer, snapshotJob, userRepository);
    }

    @Test
    void nonOwnerGets403OnRestore() {
        when(boardService.getRoleOfMember(B, "e")).thenReturn("EDITOR");
        when(boardService.getRoleOfMember(B, "v")).thenReturn("VIEWER");
        assertEquals(403, status(assertThrows(ResponseStatusException.class, () -> service.restore(B, "e", "s1", 0))));
        assertEquals(403, status(assertThrows(ResponseStatusException.class, () -> service.restore(B, "v", "s1", 0))));
        verifyNoInteractions(writer, snapshotJob, mongo);
    }

    @Test
    void listClampsLimitSortsBySeqToDescAndExcludesPending() {
        when(boardService.getRoleOfMember(B, "v")).thenReturn("VIEWER");
        when(mongo.find(any(Query.class), eq(BoardTx.class))).thenReturn(List.of());

        service.list(B, "v", null, 500);
        service.list(B, "v", null, 0);
        service.list(B, "v", null, -5);
        service.list(B, "v", null, 30);

        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo, times(4)).find(q.capture(), eq(BoardTx.class));
        assertEquals(List.of(100, 1, 1, 30), q.getAllValues().stream().map(Query::getLimit).toList());
        Document filter = q.getAllValues().get(0).getQueryObject();
        assertEquals(new ObjectId(B), filter.get("boardId"));
        assertEquals(new Document("$ne", "pending"), filter.get("state"));
        assertFalse(filter.containsKey("seqTo"), "không có beforeSeq thì không lọc seqTo");
        assertEquals(new Document("seqTo", -1), q.getAllValues().get(0).getSortObject());
        verifyNoInteractions(userRepository);
    }

    @Test
    void listBeforeSeqIsExclusiveAndJoinsUserNames() {
        when(boardService.getRoleOfMember(B, "u1")).thenReturn("EDITOR");
        when(mongo.find(any(Query.class), eq(BoardTx.class)))
                .thenReturn(List.of(tx("t3", "u1", 42), tx("t2", "u2", 41), tx("t1", "u3", 40)));
        when(userRepository.findAllById(any())).thenReturn(List.of(user("u1", "An", "Nguyen"), user("u2", "Binh", null)));

        List<HistoryService.TxView> out = service.list(B, "u1", 50L, 30);

        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(q.capture(), eq(BoardTx.class));
        assertEquals(new Document("$lt", 50L), q.getValue().getQueryObject().get("seqTo"));
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Iterable<String>> ids = ArgumentCaptor.forClass(Iterable.class);
        verify(userRepository).findAllById(ids.capture());
        Set<String> asked = new java.util.HashSet<>();
        ids.getValue().forEach(asked::add);
        assertEquals(Set.of("u1", "u2", "u3"), asked);

        assertEquals(List.of("An Nguyen", "Binh", ""), out.stream().map(HistoryService.TxView::userName).toList());
        HistoryService.TxView first = out.get(0);
        assertEquals("t3", first.txId());
        assertEquals("u1", first.userId());
        assertEquals(42, first.seqTo());
        assertEquals("user", first.source());
        assertEquals("active", first.state());
        assertEquals(1, first.summary().getPatched());
        assertEquals(Instant.parse("2026-09-25T08:00:00Z"), first.ts());
    }

    @Test
    void stateAtRejectsSeqAfterCommittedSeq() {
        when(boardService.getRoleOfMember(B, "v")).thenReturn("VIEWER");
        when(writer.committedSeq(B)).thenReturn(5L);
        assertEquals(400, status(assertThrows(ResponseStatusException.class, () -> service.stateAt(B, "v", 6))));
        assertEquals(400, status(assertThrows(ResponseStatusException.class, () -> service.stateAt(B, "v", -1))));
        verifyNoInteractions(snapshotJob);
    }

    @Test
    void stateAtReturnsReplayedElementsSortedByZ() {
        when(boardService.getRoleOfMember(B, "v")).thenReturn("VIEWER");
        when(writer.committedSeq(B)).thenReturn(5L);
        Map<String, Map<String, Object>> state = new LinkedHashMap<>();
        state.put("a", el("a", 0, 2));
        state.put("b", el("b", 0, 1));
        when(snapshotJob.replayTo(B, 3L)).thenReturn(state);

        HistoryService.StateView view = service.stateAt(B, "v", 3);

        assertEquals(3, view.seq());
        assertEquals(List.of("b", "a"), view.elements().stream().map(e -> (String) e.get("id")).toList());
    }

    @Test
    void restoreRejectsSeqAfterCommittedSeqInsideTheLock() {
        when(boardService.getRoleOfMember(B, "o")).thenReturn("OWNER");
        lockRunsInline();
        when(writer.committedSeq(B)).thenReturn(5L);

        assertEquals(400, status(assertThrows(ResponseStatusException.class, () -> service.restore(B, "o", "s1", 6))));

        InOrder order = inOrder(writer);
        order.verify(writer).withLock(eq(B), any());
        order.verify(writer).committedSeq(B);
        verify(writer, never()).commit(any());
    }

    @Test
    void restoreWithEmptyDiffReturnsEmptyAndDoesNotCommit() {
        when(boardService.getRoleOfMember(B, "o")).thenReturn("OWNER");
        lockRunsInline();
        when(writer.committedSeq(B)).thenReturn(5L);
        when(snapshotJob.replayTo(B, 2L)).thenReturn(Map.of("a", el("a", 10, 1)));
        when(writer.loadBoard(B)).thenReturn(Map.of("a", el("a", 10, 1)));

        assertEquals(HistoryResult.empty("restore"), service.restore(B, "o", "s1", 2));
        verify(writer, never()).commit(any());
    }

    @Test
    void restoreCommitsTheDiffAsARestoreTx() {
        when(boardService.getRoleOfMember(B, "o")).thenReturn("OWNER");
        lockRunsInline();
        when(writer.committedSeq(B)).thenReturn(5L);
        when(snapshotJob.replayTo(B, 2L)).thenReturn(Map.of("a", el("a", 0, 1)));
        Map<String, Map<String, Object>> current = new LinkedHashMap<>();
        current.put("a", el("a", 100, 1));
        current.put("b", el("b", 5, 1));
        when(writer.loadBoard(B)).thenReturn(current);
        when(writer.commit(any())).thenReturn(new ElementWriter.CommitResult("tx9", 6, 7, List.of(new BoardOp(), new BoardOp())));

        HistoryResult r = service.restore(B, "o", "s1", 2);

        assertEquals(new HistoryResult("restore", 2, List.of()), r);
        ArgumentCaptor<ElementWriter.CommitRequest> req = ArgumentCaptor.forClass(ElementWriter.CommitRequest.class);
        verify(writer).commit(req.capture());
        assertEquals(B, req.getValue().boardId());
        assertEquals("o", req.getValue().userId());
        assertEquals("s1", req.getValue().sessionId());
        assertEquals("restore", req.getValue().source());
        assertNull(req.getValue().mergeKey());
        assertNull(req.getValue().target());
        assertEquals(Set.of("patch:a", "delete:b"),
                req.getValue().intents().stream().map(i -> i.kind() + ":" + i.elementId()).collect(Collectors.toSet()));
    }
}
