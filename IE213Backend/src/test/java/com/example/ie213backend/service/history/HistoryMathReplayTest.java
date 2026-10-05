package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HistoryMathReplayTest {

    private static Map<String, Object> el(String id, String type, double x) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", type);
        m.put("boardId", "650000000000000000000009");
        m.put("owner", "u1");
        m.put("image", null);
        m.put("migratedFrom", null);
        m.put("x", x);
        m.put("y", 0.0);
        m.put("w", 200.0);
        m.put("h", 200.0);
        m.put("rotation", 0.0);
        m.put("z", 1.0);
        m.put("text", null);
        m.put("style", null);
        m.put("shape", null);
        m.put("connector", null);
        m.put("fieldSeq", new LinkedHashMap<String, Long>());
        m.put("version", 1L);
        return m;
    }

    private static Map<String, Object> style(String fill) {
        Map<String, Object> s = new HashMap<>();
        s.put("fill", fill);
        s.put("stroke", null);
        s.put("strokeWidth", null);
        s.put("fontSize", 12.0);
        return s;
    }

    private static BoardOp op(long seq, String kind, String id, Map<String, Object> after,
                              Map<String, Long> fsAfter, long v) {
        BoardOp o = new BoardOp();
        o.setSeq(seq);
        o.setKind(kind);
        o.setElementId(id);
        o.setAfter(after);
        o.setFsAfter(fsAfter);
        o.setV(v);
        return o;
    }

    private static Map<String, Map<String, Object>> board(Map<String, Object>... els) {
        Map<String, Map<String, Object>> b = new LinkedHashMap<>();
        for (Map<String, Object> e : els) b.put((String) e.get("id"), e);
        return b;
    }

    @Test
    void createPutsAfterWithFieldSeqAndVersion() {
        Map<String, Long> fs = Map.of("x", 5L, "y", 5L);
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(),
                List.of(op(5, "create", "E", el("E", "sticky", 10.0), fs, 1)));
        assertEquals(1, out.size());
        assertEquals(10.0, out.get("E").get("x"));
        assertEquals("sticky", out.get("E").get("type"));
        assertEquals(fs, out.get("E").get("fieldSeq"));
        assertEquals(1L, out.get("E").get("version"));
    }

    @Test
    void patchMergesAfterKeepsOtherKeysAndMergesFieldSeq() {
        Map<String, Object> e = el("E", "sticky", 0.0);
        e.put("y", 5.0);
        e.put("fieldSeq", new LinkedHashMap<>(Map.of("y", 3L)));
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("x", 100.0);
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(e),
                List.of(op(7, "patch", "E", after, Map.of("x", 7L), 2)));
        assertEquals(100.0, out.get("E").get("x"));
        assertEquals(5.0, out.get("E").get("y"));
        assertEquals(Map.of("x", 7L, "y", 3L), out.get("E").get("fieldSeq"));
        assertEquals(2L, out.get("E").get("version"));
    }

    @Test
    void patchCanSetKeyToNull() {
        Map<String, Object> e = el("E", "sticky", 0.0);
        e.put("text", "hello");
        Map<String, Object> after = new HashMap<>();
        after.put("text", null);
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(e),
                List.of(op(3, "patch", "E", after, Map.of("text", 3L), 2)));
        assertTrue(out.get("E").containsKey("text"));
        assertNull(out.get("E").get("text"));
    }

    @Test
    void patchOnMissingIdIsSkipped() {
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(el("E", "sticky", 0.0)),
                List.of(op(4, "patch", "GONE", new HashMap<>(Map.of("x", 1.0)), Map.of("x", 4L), 2)));
        assertEquals(1, out.size());
        assertFalse(out.containsKey("GONE"));
        assertEquals(0.0, out.get("E").get("x"));
    }

    @Test
    void deleteRemovesAndMissingDeleteIsSkipped() {
        Map<String, Map<String, Object>> out = HistoryMath.replay(
                board(el("E", "sticky", 0.0), el("F", "sticky", 0.0)),
                List.of(op(2, "delete", "F", null, null, 1),
                        op(3, "delete", "NOPE", null, null, 1)));
        assertEquals(List.of("E"), List.copyOf(out.keySet()));
    }

    @Test
    void toleratesSeqHoles() {
        // seq 1, 4, 9: lỗ seq do commit hỏng trước WAL
        Map<String, Object> after4 = new HashMap<>(Map.of("x", 40.0));
        Map<String, Object> after9 = new HashMap<>(Map.of("y", 90.0));
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(), List.of(
                op(1, "create", "E", el("E", "sticky", 0.0), Map.of(), 1),
                op(4, "patch", "E", after4, Map.of("x", 4L), 2),
                op(9, "patch", "E", after9, Map.of("y", 9L), 3)));
        assertEquals(40.0, out.get("E").get("x"));
        assertEquals(90.0, out.get("E").get("y"));
        assertEquals(3L, out.get("E").get("version"));
        assertEquals(Map.of("x", 4L, "y", 9L), out.get("E").get("fieldSeq"));
    }

    @Test
    void recreateAfterDeleteUsesLatestCreate() {
        Map<String, Object> again = el("E", "sticky", 77.0);
        again.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 2L)));
        Map<String, Map<String, Object>> out = HistoryMath.replay(board(), List.of(
                op(1, "create", "E", el("E", "sticky", 0.0), Map.of(), 1),
                op(2, "delete", "E", null, null, 1),
                op(3, "create", "E", again, Map.of("x", 2L), 2)));
        assertEquals(77.0, out.get("E").get("x"));
        assertEquals(2L, out.get("E").get("version"));
        assertEquals(Map.of("x", 2L), out.get("E").get("fieldSeq"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void doesNotMutateBase() {
        Map<String, Object> e = el("E", "sticky", 0.0);
        e.put("style", style("#fff"));
        Map<String, Map<String, Object>> base = board(e, el("F", "sticky", 0.0));
        Map<String, Object> after = new HashMap<>();
        after.put("x", 50.0);
        after.put("style", style("#000"));

        Map<String, Map<String, Object>> out = HistoryMath.replay(base, List.of(
                op(1, "patch", "E", after, Map.of("x", 1L, "style", 1L), 2),
                op(2, "delete", "F", null, null, 1)));

        assertEquals(50.0, out.get("E").get("x"));
        assertEquals(0.0, base.get("E").get("x"));
        assertEquals("#fff", ((Map<String, Object>) base.get("E").get("style")).get("fill"));
        assertEquals(1L, base.get("E").get("version"));
        assertTrue(((Map<String, Long>) base.get("E").get("fieldSeq")).isEmpty());
        assertTrue(base.containsKey("F"));

        // kết quả không chia sẻ map lồng nhau với base
        Map<String, Map<String, Object>> copy = HistoryMath.replay(base, List.of());
        ((Map<String, Object>) copy.get("E").get("style")).put("fill", "#123");
        assertEquals("#fff", ((Map<String, Object>) base.get("E").get("style")).get("fill"));
        assertNotSame(base.get("E"), copy.get("E"));
    }

    @Test
    void nullBaseAndNullOpsGiveEmptyState() {
        assertTrue(HistoryMath.replay(null, null).isEmpty());
        assertTrue(HistoryMath.replay(board(), List.of()).isEmpty());
    }
}
