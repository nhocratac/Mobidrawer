package com.example.ie213backend.domain.model;

import com.example.ie213backend.repository.BoardCounterRepository;
import com.example.ie213backend.repository.BoardOpRepository;
import com.example.ie213backend.repository.BoardSnapshotRepository;
import com.example.ie213backend.repository.BoardTxRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

class HistoryModelsTest {

    private static Map<String, CompoundIndex> indexes(Class<?> c) {
        CompoundIndexes many = c.getAnnotation(CompoundIndexes.class);
        CompoundIndex[] arr = many != null ? many.value() : c.getAnnotationsByType(CompoundIndex.class);
        return Arrays.stream(arr).collect(Collectors.toMap(CompoundIndex::name, i -> i));
    }

    private static void assertObjectIdField(Class<?> c, String name) throws Exception {
        Field f = c.getDeclaredField(name).getAnnotation(Field.class);
        assertNotNull(f, c.getSimpleName() + "." + name + " thiếu @Field");
        assertEquals(FieldType.OBJECT_ID, f.targetType());
    }

    @Test
    void boardTxNestedTypesConstruct() {
        BoardTx.Summary s = new BoardTx.Summary(1, 2, 3);
        assertEquals(1, s.getCreated());
        assertEquals(2, s.getPatched());
        assertEquals(3, s.getDeleted());

        BoardOp op = new BoardOp();
        op.setSeq(5);
        op.setKind("patch");
        op.setElementId("e1");
        op.setBefore(Map.of("x", 0.0));
        op.setAfter(Map.of("x", 100.0));
        op.setFsBefore(Map.of("x", 0L));
        op.setFsAfter(Map.of("x", 5L));
        op.setV(2);
        BoardTx.Pending p = new BoardTx.Pending(5, 5, List.of(op));
        assertEquals(5, p.getSeqFrom());
        assertEquals(5, p.getSeqTo());
        assertEquals("e1", p.getOps().get(0).getElementId());
        assertEquals(5L, p.getOps().get(0).getFsAfter().get("x"));

        Instant now = Instant.now();
        BoardTx.Prev prev = new BoardTx.Prev(4, s, now);
        assertEquals(4, prev.getSeqTo());
        assertSame(s, prev.getSummary());
        assertEquals(now, prev.getTs());

        BoardTx tx = new BoardTx();
        tx.setState("pending");
        tx.setSource("user");
        tx.setPending(p);
        tx.setPrev(prev);
        tx.setSummary(s);
        tx.setTarget(null);
        tx.setMergeKey("text:e1:abc");
        assertEquals("pending", tx.getState());
        assertSame(p, tx.getPending());
        assertEquals("text:e1:abc", tx.getMergeKey());
    }

    @Test
    void boardElementHasFieldSeq() {
        BoardElement e = new BoardElement();
        assertNull(e.getFieldSeq(), "legacy element: fieldSeq thiếu = null");
        e.setFieldSeq(Map.of("x", 12L));
        assertEquals(12L, e.getFieldSeq().get("x"));
    }

    @Test
    void documentsAndIndexesMatchContract() throws Exception {
        assertEquals("boardOps", BoardOp.class.getAnnotation(Document.class).collection());
        assertEquals("boardTxs", BoardTx.class.getAnnotation(Document.class).collection());
        assertEquals("boardCounters", BoardCounter.class.getAnnotation(Document.class).collection());
        assertEquals("boardSnapshots", BoardSnapshot.class.getAnnotation(Document.class).collection());

        Map<String, CompoundIndex> op = indexes(BoardOp.class);
        assertEquals("{'boardId':1,'seq':1}", op.get("board_seq").def());
        assertTrue(op.get("board_seq").unique());
        assertEquals("{'boardId':1,'elementId':1,'seq':-1}", op.get("board_el_seq").def());

        Map<String, CompoundIndex> tx = indexes(BoardTx.class);
        assertEquals("{'boardId':1,'userId':1,'seqTo':-1}", tx.get("tx_user").def());
        assertEquals("{'boardId':1,'seqTo':-1}", tx.get("tx_board").def());
        assertEquals("{'boardId':1,'state':1}", tx.get("tx_state").def());

        Map<String, CompoundIndex> snap = indexes(BoardSnapshot.class);
        assertEquals("{'boardId':1,'seq':1}", snap.get("snap_board_seq").def());
        assertTrue(snap.get("snap_board_seq").unique());

        assertObjectIdField(BoardOp.class, "boardId");
        assertObjectIdField(BoardTx.class, "boardId");
        assertObjectIdField(BoardSnapshot.class, "boardId");

        BoardCounter c = new BoardCounter();
        c.setId("650000000000000000000001");
        c.setSeq(3);
        c.setCommittedSeq(2);
        assertEquals(3, c.getSeq());
        assertEquals(2, c.getCommittedSeq());
    }

    @Test
    void repositoriesExposeDerivedQueries() throws Exception {
        assertTrue(MongoRepository.class.isAssignableFrom(BoardOpRepository.class));
        assertTrue(MongoRepository.class.isAssignableFrom(BoardTxRepository.class));
        assertTrue(MongoRepository.class.isAssignableFrom(BoardCounterRepository.class));
        assertTrue(MongoRepository.class.isAssignableFrom(BoardSnapshotRepository.class));

        assertNotNull(BoardOpRepository.class.getMethod("findByBoardIdAndTxIdOrderBySeqAsc", String.class, String.class));
        assertNotNull(BoardTxRepository.class.getMethod("findFirstByBoardIdAndState", String.class, String.class));
        assertNotNull(BoardTxRepository.class.getMethod("findTop50ByBoardIdAndUserIdAndSourceInOrderBySeqToDesc",
                String.class, String.class, Collection.class));
        assertNotNull(BoardTxRepository.class.getMethod("findByBoardIdAndUserIdAndSourceOrderBySeqToDesc",
                String.class, String.class, String.class));
        assertNotNull(BoardSnapshotRepository.class.getMethod("findFirstByBoardIdAndSeqLessThanEqualOrderBySeqDesc",
                String.class, long.class));
    }
}
