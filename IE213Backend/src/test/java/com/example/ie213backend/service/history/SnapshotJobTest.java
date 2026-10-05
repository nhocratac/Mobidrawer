package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardCounter;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.BoardOp;
import com.example.ie213backend.domain.model.BoardSnapshot;
import com.example.ie213backend.domain.model.BoardTx;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SnapshotJobTest {
    static final String B = "650000000000000000000009";
    static final String A = "650000000000000000000001";

    MongoTemplate mongo = mock(MongoTemplate.class);
    SnapshotJob job = new SnapshotJob(mongo);

    @AfterEach
    void tearDown() {
        job.shutdown();
    }

    private static Map<String, Object> el(String id, double x) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", "sticky");
        m.put("image", null);
        m.put("x", x);
        m.put("fieldSeq", new LinkedHashMap<String, Long>());
        m.put("version", 1L);
        return m;
    }

    private static BoardSnapshot snapshot(long seq, List<Map<String, Object>> elements) {
        BoardSnapshot s = new BoardSnapshot();
        s.setId(new ObjectId().toHexString());
        s.setBoardId(B);
        s.setSeq(seq);
        s.setElements(elements);
        return s;
    }

    private static BoardOp patchX(long seq, double x) {
        BoardOp op = new BoardOp();
        op.setSeq(seq);
        op.setKind("patch");
        op.setElementId(A);
        op.setAfter(Map.of("x", x));
        op.setFsAfter(Map.of("x", seq));
        op.setV(2);
        return op;
    }

    @Test
    void noSnapshotWhenSeqDoesNotCrossAMultipleOf200() {
        job.maybeSnapshot(B, 198, 199);
        job.maybeSnapshot(B, 200, 399);
        job.maybeSnapshot(B, 0, 0);
        job.shutdown();
        verifyNoInteractions(mongo);
    }

    @Test
    void crossingBuildsAtTheMultipleAsynchronously() {
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class))).thenReturn(snapshot(400, List.of()));
        // tx merge có thể nhảy qua nhiều mốc: chụp tại mốc cao nhất <= seqTo
        job.maybeSnapshot(B, 150, 401);
        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo, timeout(2000)).findOne(q.capture(), eq(BoardSnapshot.class));
        assertEquals(400L, q.getValue().getQueryObject().get("seq"));
        assertEquals(new ObjectId(B), q.getValue().getQueryObject().get("boardId"));
        job.shutdown();
        verify(mongo, never()).insert(any(BoardSnapshot.class));
    }

    @Test
    void buildErrorIsOnlyLoggedAndTheJobKeepsRunning() {
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class)))
                .thenThrow(new RuntimeException("mongo down"))
                .thenReturn(snapshot(400, List.of()));
        assertDoesNotThrow(() -> job.maybeSnapshot(B, 199, 200));
        job.maybeSnapshot(B, 399, 400);
        verify(mongo, timeout(2000).times(2)).findOne(any(Query.class), eq(BoardSnapshot.class));
    }

    @Test
    void buildReplaysCommittedOpsOnNearestSnapshotAndSkipsPendingRange() {
        BoardSnapshot snap0 = snapshot(0, List.of(el(A, 0)));
        // lần 1: chưa có snapshot 200; lần 2: snapshot gần nhất <= 200 là snapshot 0
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class))).thenReturn(null, snap0);
        BoardTx pending = new BoardTx();
        pending.setState("pending");
        pending.setSeqFrom(130);
        pending.setSeqTo(130);
        pending.setPending(new BoardTx.Pending(130, 130, List.of()));
        when(mongo.find(any(Query.class), eq(BoardTx.class))).thenReturn(List.of(pending));
        when(mongo.find(any(Query.class), eq(BoardOp.class))).thenReturn(List.of(patchX(120, 50), patchX(130, 999)));
        when(mongo.insert(any(BoardSnapshot.class))).thenAnswer(inv -> inv.getArgument(0));

        BoardSnapshot out = job.build(B, 200);

        assertEquals(B, out.getBoardId());
        assertEquals(200, out.getSeq());
        assertEquals(1, out.getElements().size());
        Map<String, Object> a = out.getElements().get(0);
        assertEquals(50.0, a.get("x"), "op của tx đang pending không được replay");
        assertEquals(Map.of("x", 120L), a.get("fieldSeq"));
        assertEquals(0.0, snap0.getElements().get(0).get("x"), "không sửa snapshot gốc");

        ArgumentCaptor<Query> ops = ArgumentCaptor.forClass(Query.class);
        verify(mongo).find(ops.capture(), eq(BoardOp.class));
        assertEquals(new Document("$gt", 0L).append("$lte", 200L), ops.getValue().getQueryObject().get("seq"));
        assertEquals(new Document("seq", 1), ops.getValue().getSortObject());
    }

    @Test
    void buildReturnsTheExistingSnapshotOnDuplicateKey() {
        BoardSnapshot existing = snapshot(200, List.of(el(A, 7)));
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class)))
                .thenReturn(null, snapshot(0, List.of(el(A, 0))), existing);
        when(mongo.find(any(Query.class), eq(BoardTx.class))).thenReturn(List.of());
        when(mongo.find(any(Query.class), eq(BoardOp.class))).thenReturn(List.of());
        when(mongo.insert(any(BoardSnapshot.class))).thenThrow(new DuplicateKeyException("dup (boardId, seq)"));

        assertSame(existing, job.build(B, 200));
    }

    @Test
    void boardWithoutSnapshotOrCounterIsItsCurrentElements() {
        when(mongo.findOne(any(Query.class), eq(BoardSnapshot.class))).thenReturn(null);
        when(mongo.exists(any(Query.class), eq(BoardCounter.class))).thenReturn(false);
        BoardElement e = new BoardElement();
        e.setId(A);
        e.setBoardId(B);
        e.setType("sticky");
        e.setX(5);
        when(mongo.find(any(Query.class), eq(BoardElement.class))).thenReturn(List.of(e));

        Map<String, Map<String, Object>> state = job.replayTo(B, 0);

        assertEquals(Set.of(A), state.keySet());
        assertEquals(5.0, state.get(A).get("x"));
        verify(mongo, never()).find(any(Query.class), eq(BoardOp.class));
    }

    @Test
    void maybeSnapshotAfterShutdownDoesNotThrow() {
        job.shutdown();
        assertDoesNotThrow(() -> job.maybeSnapshot(B, 199, 200));
    }
}
