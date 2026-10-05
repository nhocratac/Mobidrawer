package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import org.junit.jupiter.api.Test;

import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;

class CommitPlannerTest {
    private static final Function<String, Long> NO_HISTORY = id -> 0L;
    private static final long SEQ = CommitPlanner.SEQ;

    // element đã chuẩn hoá, cùng dạng ElementNormalizer.full
    private static Map<String, Object> el(String id, String type) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", type);
        m.put("boardId", "650000000000000000000009");
        m.put("owner", "u1");
        m.put("image", null);
        m.put("migratedFrom", null);
        m.put("x", 0.0);
        m.put("y", 0.0);
        m.put("w", 100.0);
        m.put("h", 100.0);
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

    private static Map<String, Object> end(String elementId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("elementId", elementId);
        m.put("anchor", null);
        return m;
    }

    private static Map<String, Object> conn(String from, String to) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("from", end(from));
        m.put("to", end(to));
        return m;
    }

    private static Map<String, Object> connector(String id, String from, String to) {
        Map<String, Object> m = el(id, "connector");
        m.put("connector", conn(from, to));
        return m;
    }

    @SafeVarargs
    private static Map<String, Map<String, Object>> board(Map<String, Object>... els) {
        Map<String, Map<String, Object>> b = new LinkedHashMap<>();
        for (Map<String, Object> e : els) b.put((String) e.get("id"), e);
        return b;
    }

    private static Map<String, Object> set(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private static List<String> kinds(List<BoardOp> ops) {
        return ops.stream().map(o -> o.getKind() + ":" + o.getElementId()).toList();
    }

    @Test
    void latePatchForDeletedElementIsDropped() {
        // Review Focus 3: người khác vừa xoá element, patch text đến muộn thì bỏ im lặng
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("GONE", set("text", "hi"))),
                board(el("A", "sticky")), id -> {
                    throw new AssertionError("không được hỏi version của element đã mất");
                });
        assertTrue(ops.isEmpty());
    }

    @Test
    void deleteOfMissingElementIsDropped() {
        assertTrue(CommitPlanner.plan(List.of(Intent.delete("GONE")), board(el("A", "sticky")), NO_HISTORY).isEmpty());
    }

    @Test
    void duplicateCreateIsDropped() {
        assertTrue(CommitPlanner.plan(List.of(Intent.create(el("A", "sticky"))), board(el("A", "sticky")), NO_HISTORY)
                .isEmpty());
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(el("N", "sticky")), Intent.create(el("N", "sticky"))),
                board(), NO_HISTORY);
        assertEquals(List.of("create:N"), kinds(ops));
    }

    @Test
    void createThenPatchFoldsIntoCreate() {
        Map<String, Object> n = el("N", "sticky");
        n.put("text", "a");
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(n), Intent.patch("N", set("x", 50.0, "text", "b"))),
                board(), NO_HISTORY);
        assertEquals(List.of("create:N"), kinds(ops));
        BoardOp op = ops.get(0);
        assertNull(op.getBefore());
        assertEquals(50.0, op.getAfter().get("x"));
        assertEquals("b", op.getAfter().get("text"));
        assertEquals(1L, op.getV());
        assertEquals(1L, op.getAfter().get("version"));
        assertEquals(SEQ, op.getFsAfter().get("x"));
        assertEquals(SEQ, op.getFsAfter().get("text"));
        assertFalse(op.getFsAfter().containsKey("style"));
        assertEquals(op.getFsAfter(), op.getAfter().get("fieldSeq"));
        assertTrue(op.getFsBefore().isEmpty());
        assertEquals(0.0, n.get("x"), "không được sửa map của intent");
    }

    @Test
    void patchThenPatchMergesIntoOnePatch() {
        Map<String, Object> a = el("A", "sticky");
        a.put("x", 10.0);
        a.put("version", 4L);
        a.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 7L)));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("A", set("x", 20.0)),
                Intent.patch("A", set("x", 30.0, "y", 5.0))), board(a), NO_HISTORY);
        assertEquals(List.of("patch:A"), kinds(ops));
        BoardOp op = ops.get(0);
        assertEquals(Map.of("x", 10.0, "y", 0.0), op.getBefore());
        assertEquals(Map.of("x", 30.0, "y", 5.0), op.getAfter());
        assertEquals(Map.of("x", 7L, "y", 0L), op.getFsBefore());
        assertEquals(Map.of("x", SEQ, "y", SEQ), op.getFsAfter());
        assertEquals(5L, op.getV());
    }

    @Test
    void patchThenDeleteBecomesDelete() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("A", set("x", 20.0)), Intent.delete("A")),
                board(el("A", "sticky")), NO_HISTORY);
        assertEquals(List.of("delete:A"), kinds(ops));
        assertEquals(0.0, ops.get(0).getBefore().get("x"));
        assertEquals(1L, ops.get(0).getV());
    }

    @Test
    void createThenDeleteCancelsOut() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(el("N", "sticky")), Intent.delete("N"),
                Intent.patch("N", set("x", 1.0))), board(), NO_HISTORY);
        assertTrue(ops.isEmpty());
    }

    @Test
    void deleteKeepsFullElementIncludingImage() {
        Map<String, Object> img = el("I", "image");
        img.put("image", new LinkedHashMap<>(Map.of("url", "https://x/a.png", "cloudinaryId", "cid", "alt", "a")));
        img.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 11L)));
        img.put("version", 6L);
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.delete("I")), board(img), NO_HISTORY);
        BoardOp op = ops.get(0);
        assertEquals("delete", op.getKind());
        assertEquals(img, op.getBefore());
        assertEquals(Map.of("url", "https://x/a.png", "cloudinaryId", "cid", "alt", "a"), op.getBefore().get("image"));
        assertNull(op.getAfter());
        assertEquals(Map.of("x", 11L), op.getFsBefore());
        assertTrue(op.getFsAfter().isEmpty());
        assertEquals(6L, op.getV());
    }

    @Test
    void cascadeDeletesAttachedConnectorsOnce() {
        Map<String, Map<String, Object>> b = board(el("A", "sticky"), el("B", "sticky"), connector("C", "A", "B"));
        assertEquals(List.of("delete:A", "delete:B", "delete:C"),
                kinds(CommitPlanner.plan(List.of(Intent.delete("A"), Intent.delete("B")), b, NO_HISTORY)));
        assertEquals(List.of("delete:C", "delete:A", "delete:B"),
                kinds(CommitPlanner.plan(List.of(Intent.delete("C"), Intent.delete("A"), Intent.delete("B")), b, NO_HISTORY)));
    }

    @Test
    void cascadeUsesPostPatchStateRepointAway() {
        // C đang nối E→F, batch đổi sang E→G rồi xoá F: C không bị xoá
        Map<String, Map<String, Object>> b = board(el("E", "sticky"), el("F", "sticky"), el("G", "sticky"),
                connector("C", "E", "F"));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("C", set("connector", conn("E", "G"))),
                Intent.delete("F")), b, NO_HISTORY);
        assertEquals(List.of("patch:C", "delete:F"), kinds(ops));
    }

    @Test
    void cascadeUsesPostPatchStateRepointOnto() {
        // C đang nối E→G, batch đổi sang E→F rồi xoá F: C bị cascade, patch của C bị bỏ
        Map<String, Map<String, Object>> b = board(el("E", "sticky"), el("F", "sticky"), el("G", "sticky"),
                connector("C", "E", "G"));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("C", set("connector", conn("E", "F"))),
                Intent.delete("F")), b, NO_HISTORY);
        assertEquals(List.of("delete:C", "delete:F"), kinds(ops));
    }

    @Test
    void connectorToElementCreatedInSameBatchIsAllowed() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(connector("K", "N", "E")),
                Intent.create(el("N", "sticky"))), board(el("E", "sticky")), NO_HISTORY);
        assertEquals(List.of("create:N", "create:K"), kinds(ops));
    }

    @Test
    void invalidConnectorEndThrows() {
        Map<String, Map<String, Object>> b = board(el("E", "sticky"), el("F", "sticky"), connector("C", "E", "F"));
        IllegalArgumentException missing = assertThrows(IllegalArgumentException.class, () -> CommitPlanner.plan(
                List.of(Intent.create(connector("K", "E", "X"))), b, NO_HISTORY));
        assertEquals("connector end not found on this board", missing.getMessage());
        // đầu trỏ tới element bị xoá cùng batch
        assertThrows(IllegalArgumentException.class, () -> CommitPlanner.plan(
                List.of(Intent.create(connector("K", "E", "F")), Intent.delete("F")), b, NO_HISTORY));
        // đầu là connector
        assertThrows(IllegalArgumentException.class, () -> CommitPlanner.plan(
                List.of(Intent.create(connector("K", "E", "C"))), b, NO_HISTORY));
        // patch connector trỏ tới id không có
        assertThrows(IllegalArgumentException.class, () -> CommitPlanner.plan(
                List.of(Intent.patch("C", set("connector", conn("E", "X")))), b, NO_HISTORY));
    }

    @Test
    void opsFollowFixedOrder() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.delete("D"), Intent.create(connector("K", "E", "N")),
                        Intent.patch("E", set("x", 5.0)), Intent.create(el("N", "sticky"))),
                board(el("E", "sticky"), el("D", "sticky")), NO_HISTORY);
        assertEquals(List.of("create:N", "patch:E", "create:K", "delete:D"), kinds(ops));
    }

    @Test
    void recreateKeepsFieldSeqAndVersionNeverDecreases() {
        // undo-delete: element mang fieldSeq cũ, op mới nhất trên A có v = 7
        Map<String, Object> a = el("A", "sticky");
        a.put("text", "hi");
        a.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 12L, "text", 15L)));
        a.put("version", 3L);
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(a)), board(), id -> "A".equals(id) ? 7L : 0L);
        BoardOp op = ops.get(0);
        assertEquals("create", op.getKind());
        assertEquals(8L, op.getV());
        assertEquals(8L, op.getAfter().get("version"));
        assertEquals(Map.of("x", 12L, "text", 15L), op.getFsAfter());
        assertEquals(Map.of("x", 12L, "text", 15L), op.getAfter().get("fieldSeq"));
    }

    @Test
    void freshCreateStampsSeqOnNonNullKeys() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.create(el("N", "sticky"))), board(), NO_HISTORY);
        BoardOp op = ops.get(0);
        assertEquals(1L, op.getV());
        assertEquals(Set.of("x", "y", "w", "h", "rotation", "z"), op.getFsAfter().keySet());
        op.getFsAfter().values().forEach(v -> assertEquals(SEQ, v));
    }

    @Test
    void fsOverrideIsHonored() {
        Map<String, Object> a = el("A", "sticky");
        a.put("x", 100.0);
        a.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 12L)));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("A", set("x", 0.0, "y", 3.0), Map.of("x", 3L))),
                board(a), NO_HISTORY);
        BoardOp op = ops.get(0);
        assertEquals(Map.of("x", 3L, "y", SEQ), op.getFsAfter());
        assertEquals(Map.of("x", 12L, "y", 0L), op.getFsBefore());
        assertEquals(Map.of("x", 100.0, "y", 0.0), op.getBefore());
    }

    @Test
    void patchWithUnchangedValueStillProducesOp() {
        Map<String, Object> a = el("A", "sticky");
        a.put("x", 10.0);
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("A", set("x", 10.0))), board(a), NO_HISTORY);
        assertEquals(List.of("patch:A"), kinds(ops));
        assertEquals(Map.of("x", 10.0), ops.get(0).getBefore());
        assertEquals(Map.of("x", 10.0), ops.get(0).getAfter());
        assertEquals(2L, ops.get(0).getV());
    }

    @Test
    void deleteThenCreateSameIdReplacesWithoutCascade() {
        // restore đổi type/image (Review Focus 5): diff sinh delete + create cùng id
        Map<String, Object> e = el("E", "sticky");
        e.put("version", 3L);
        Map<String, Object> img = el("E", "image");
        img.put("image", new LinkedHashMap<>(Map.of("url", "https://x/a.png")));
        Map<String, Map<String, Object>> b = board(e, el("F", "sticky"), connector("C", "E", "F"));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.delete("E"), Intent.create(img)), b, id -> 3L);
        assertEquals(List.of("delete:E", "create:E"), kinds(ops));
        assertEquals(3L, ops.get(0).getV());
        assertEquals(4L, ops.get(1).getV());
        assertEquals(Map.of("url", "https://x/a.png"), ops.get(1).getAfter().get("image"));
    }

    @Test
    void unchangedKeyKeepsCurrentMarkWhileChangedKeyGetsSeq() {
        Map<String, Object> s = el("S", "sticky");
        s.put("x", 5.0);
        s.put("fieldSeq", new LinkedHashMap<>(Map.of("x", 3L)));
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("S", set("x", 5.0, "w", 150.0))), board(s), NO_HISTORY);
        BoardOp op = ops.get(0);
        assertEquals(3L, op.getFsAfter().get("x"), "x không đổi giá trị: giữ dấu cũ");
        assertEquals(SEQ, op.getFsAfter().get("w"));
        assertEquals(Set.of("x", "w"), op.getAfter().keySet(), "key không đổi vẫn nằm trong before/after/broadcast");
        assertEquals(Set.of("x", "w"), op.getBefore().keySet());
    }

    @Test
    void unchangedKeyWithoutMarkDefaultsToZero() {
        List<BoardOp> ops = CommitPlanner.plan(List.of(Intent.patch("S", set("x", 0.0, "w", 150.0))),
                board(el("S", "sticky")), NO_HISTORY);
        assertEquals(0L, ops.get(0).getFsAfter().get("x"));
        assertEquals(SEQ, ops.get(0).getFsAfter().get("w"));
    }

    @Test
    void replaceDeleteComesFirstOfAllOpsAndDoesNotCascadeAttachedConnector() {
        Map<String, Object> img = el("E", "image");
        img.put("image", new LinkedHashMap<>(Map.of("url", "https://x/a.png")));
        Map<String, Map<String, Object>> b = board(el("E", "image"), el("F", "sticky"), el("G", "sticky"),
                connector("C", "E", "F"));
        List<BoardOp> ops = CommitPlanner.plan(List.of(
                Intent.create(el("N", "sticky")),
                Intent.patch("G", set("x", 9.0)),
                Intent.delete("E"), Intent.create(img)), b, id -> 1L);
        assertEquals("delete:E", kinds(ops).get(0));
        assertTrue(kinds(ops).indexOf("create:E") > 0);
        assertTrue(kinds(ops).containsAll(List.of("create:N", "patch:G", "create:E")));
        assertFalse(kinds(ops).contains("delete:C"), kinds(ops).toString());
    }
}
