package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

import static com.example.ie213backend.service.history.HistoryMath.Direction.REDO;
import static com.example.ie213backend.service.history.HistoryMath.Direction.UNDO;
import static org.junit.jupiter.api.Assertions.*;

class HistoryMathInverseTest {
    private static final String BOARD = "650000000000000000000009";
    private static final String ALICE = "alice";
    private static final String BOB = "bob";

    // board giả lập (id -> full normalized) + op log; JUnit tạo instance mới cho mỗi test
    private final Map<String, Map<String, Object>> board = new LinkedHashMap<>();
    private final List<BoardOp> log = new ArrayList<>();
    private long nextSeq = 10;
    private int nextTx = 1;

    private final BiFunction<String, Long, List<BoardOp>> later = (id, afterSeq) -> log.stream()
            .filter(o -> o.getElementId().equals(id) && o.getSeq() > afterSeq)
            .sorted(Comparator.comparingLong(BoardOp::getSeq))
            .toList();

    // ---------- builders ----------

    private static Map<String, Object> base(String id, String type) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("type", type);
        m.put("boardId", BOARD);
        m.put("owner", ALICE);
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

    private static Map<String, Object> shape(String id, double x) {
        Map<String, Object> m = base(id, "shape");
        m.put("x", x);
        m.put("shape", map("kind", "rect"));
        return m;
    }

    private static Map<String, Object> imageEl(String id) {
        Map<String, Object> img = new LinkedHashMap<>();
        img.put("url", "https://res.cloudinary.com/demo/image/upload/a.png");
        img.put("cloudinaryId", "a");
        img.put("alt", "logo");
        Map<String, Object> m = base(id, "image");
        m.put("image", img);
        return m;
    }

    private static Map<String, Object> end(String elementId) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("elementId", elementId);
        m.put("anchor", "auto");
        return m;
    }

    private static Map<String, Object> conn(String from, String to) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("from", end(from));
        m.put("to", end(to));
        return m;
    }

    private static Map<String, Object> connector(String id, String from, String to) {
        Map<String, Object> m = base(id, "connector");
        m.put("connector", conn(from, to));
        return m;
    }

    private static Map<String, Object> map(String k, Object v) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put(k, v);
        return m;
    }

    @SuppressWarnings("unchecked")
    private static <T> T copy(T v) {
        if (v instanceof Map<?, ?> m) {
            Map<String, Object> out = new LinkedHashMap<>();
            m.forEach((k, x) -> out.put((String) k, copy(x)));
            return (T) out;
        }
        if (v instanceof List<?> l) {
            List<Object> out = new ArrayList<>();
            l.forEach(x -> out.add(copy(x)));
            return (T) out;
        }
        return v;
    }

    private static long fs(Map<String, Object> el, String k) {
        if (el.get("fieldSeq") instanceof Map<?, ?> m && m.get(k) instanceof Number n) return n.longValue();
        return 0L;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> fsMap(Map<String, Object> el) {
        if (!(el.get("fieldSeq") instanceof Map)) el.put("fieldSeq", new LinkedHashMap<String, Object>());
        return (Map<String, Object>) el.get("fieldSeq");
    }

    private static Map<String, Long> longs(Map<String, Object> el) {
        Map<String, Long> out = new LinkedHashMap<>();
        if (el.get("fieldSeq") instanceof Map<?, ?> m) {
            m.forEach((k, v) -> out.put((String) k, ((Number) v).longValue()));
        }
        return out;
    }

    private static long version(Map<String, Object> el) {
        return el.get("version") instanceof Number n ? n.longValue() : 0L;
    }

    @SafeVarargs
    private static List<BoardOp> concat(List<BoardOp>... parts) {
        List<BoardOp> out = new ArrayList<>();
        for (List<BoardOp> p : parts) out.addAll(p);
        return out;
    }

    // ---------- giả lập writer ----------

    private BoardOp op(String tx, String user, String kind, String id, Map<String, Object> before,
                       Map<String, Object> after, Map<String, Long> fsB, Map<String, Long> fsA, long v) {
        BoardOp o = new BoardOp();
        o.setBoardId(BOARD);
        o.setSeq(nextSeq++);
        o.setTxId(tx);
        o.setUserId(user);
        o.setTs(Instant.now());
        o.setKind(kind);
        o.setElementId(id);
        o.setBefore(before);
        o.setAfter(after);
        o.setFsBefore(fsB);
        o.setFsAfter(fsA);
        o.setV(v);
        log.add(o);
        return o;
    }

    private List<BoardOp> userCreate(String user, Map<String, Object> el) {
        long seq = nextSeq;
        Map<String, Object> e = copy(el);
        Map<String, Long> fsA = new LinkedHashMap<>();
        ElementKeys.K.forEach(k -> fsA.put(k, seq));
        e.put("fieldSeq", new LinkedHashMap<>(fsA));
        e.put("version", 1L);
        String id = (String) e.get("id");
        board.put(id, e);
        return List.of(op("t" + nextTx++, user, "create", id, null, copy(e), Map.of(), fsA, 1L));
    }

    private List<BoardOp> userPatch(String user, String id, String key, Object value) {
        long seq = nextSeq;
        Map<String, Object> cur = board.get(id);
        BoardOp o = op("t" + nextTx++, user, "patch", id, map(key, copy(cur.get(key))), map(key, copy(value)),
                Map.of(key, fs(cur, key)), Map.of(key, seq), version(cur) + 1);
        cur.put(key, copy(value));
        fsMap(cur).put(key, seq);
        cur.put("version", o.getV());
        return List.of(o);
    }

    private List<BoardOp> userDelete(String user, String... ids) {
        String tx = "t" + nextTx++;
        List<BoardOp> out = new ArrayList<>();
        for (String id : ids) {
            Map<String, Object> cur = board.remove(id);
            out.add(op(tx, user, "delete", id, copy(cur), null, longs(cur), Map.of(), version(cur)));
        }
        return out;
    }

    // Áp kết quả inverse như một tx undo/redo của `user`, trả về ops của tx đó
    private List<BoardOp> apply(HistoryMath.InverseResult r, String user) {
        String tx = "t" + nextTx++;
        List<BoardOp> out = new ArrayList<>();
        for (Intent in : r.intents()) {
            long seq = nextSeq;
            switch (in.kind()) {
                case "create" -> {
                    Map<String, Object> el = copy(in.element());
                    long v = version(el) + 1;
                    el.put("version", v);
                    board.put(in.elementId(), el);
                    out.add(op(tx, user, "create", in.elementId(), null, copy(el), Map.of(), longs(el), v));
                }
                case "patch" -> {
                    Map<String, Object> cur = board.get(in.elementId());
                    Map<String, Object> before = new LinkedHashMap<>();
                    Map<String, Long> fsB = new LinkedHashMap<>();
                    Map<String, Long> fsA = new LinkedHashMap<>();
                    for (String k : in.set().keySet()) {
                        before.put(k, copy(cur.get(k)));
                        fsB.put(k, fs(cur, k));
                        fsA.put(k, in.fsOverride().getOrDefault(k, seq));
                    }
                    long v = version(cur) + 1;
                    out.add(op(tx, user, "patch", in.elementId(), before, copy(in.set()), fsB, fsA, v));
                    in.set().forEach((k, val) -> cur.put(k, copy(val)));
                    fsA.forEach((k, s) -> fsMap(cur).put(k, s));
                    cur.put("version", v);
                }
                case "delete" -> {
                    Map<String, Object> cur = board.remove(in.elementId());
                    out.add(op(tx, user, "delete", in.elementId(), copy(cur), null, longs(cur), Map.of(), version(cur)));
                }
                default -> fail("unknown intent kind " + in.kind());
            }
        }
        return out;
    }

    private HistoryMath.InverseResult run(HistoryMath.Direction dir, List<BoardOp> t, List<BoardOp> u) {
        return HistoryMath.inverse(dir, t, u, board, ALICE, later);
    }

    private void assertX(String id, double x, long fsX) {
        assertEquals(x, ((Number) board.get(id).get("x")).doubleValue());
        assertEquals(fsX, fs(board.get(id), "x"));
    }

    // ---------- §7.5 ----------

    @Test
    void example1_undoSkipsKeyModifiedByOtherUser() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userPatch(ALICE, "S", "x", 100.0);          // seq 10
        userPatch(BOB, "S", "style", map("fill", "#ff0000"));          // seq 11
        userPatch(BOB, "S", "x", 200.0);                               // seq 12

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", "x", "modified", BOB)), r.skipped());
    }

    @Test
    void example2_sameUserMultiStepUndoRedoOnSameKey() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t1 = userPatch(ALICE, "S", "x", 100.0);         // seq 10, fsB 0, fsA 10
        List<BoardOp> t2 = userPatch(ALICE, "S", "x", 200.0);         // seq 11, fsB 10, fsA 11

        HistoryMath.InverseResult undoT2 = run(UNDO, t2, null);
        assertTrue(undoT2.skipped().isEmpty());
        List<BoardOp> u2 = apply(undoT2, ALICE);
        assertX("S", 100.0, 10);

        List<BoardOp> u1 = apply(run(UNDO, t1, null), ALICE);
        assertX("S", 0.0, 0);

        HistoryMath.InverseResult redoT1 = run(REDO, t1, u1);
        assertTrue(redoT1.skipped().isEmpty());
        apply(redoT1, ALICE);
        assertX("S", 100.0, 10);

        List<BoardOp> r2 = apply(run(REDO, t2, u2), ALICE);
        assertX("S", 200.0, 11);
        // R2 mang fsBefore = T2.fsB, fsAfter = T2.fsA
        assertEquals(Map.of("x", 10L), r2.get(0).getFsBefore());
        assertEquals(Map.of("x", 11L), r2.get(0).getFsAfter());

        HistoryMath.InverseResult undoR2 = run(UNDO, r2, null);
        assertTrue(undoR2.skipped().isEmpty());
        apply(undoR2, ALICE);
        assertX("S", 100.0, 10);
    }

    @Test
    void example2_variant_redoBlockedWhenOtherUserWroteKey() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t1 = userPatch(ALICE, "S", "x", 100.0);
        List<BoardOp> t2 = userPatch(ALICE, "S", "x", 200.0);
        apply(run(UNDO, t2, null), ALICE);
        List<BoardOp> u1 = apply(run(UNDO, t1, null), ALICE);
        userPatch(BOB, "S", "x", 50.0);                                // fs x = seq của Bob

        HistoryMath.InverseResult r = run(REDO, t1, u1);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", "x", "modified", BOB)), r.skipped());
    }

    @Test
    void example3_createMoveUndoUndoRedoRedo() {
        List<BoardOp> t1 = userCreate(ALICE, shape("E", 0.0));        // seq 10
        List<BoardOp> t2 = userPatch(ALICE, "E", "x", 100.0);         // seq 11

        List<BoardOp> u2 = apply(run(UNDO, t2, null), ALICE);
        assertX("E", 0.0, 10);

        HistoryMath.InverseResult undoT1 = run(UNDO, t1, null);
        assertEquals(1, undoT1.intents().size());
        assertEquals("delete", undoT1.intents().get(0).kind());
        List<BoardOp> u1 = apply(undoT1, ALICE);
        assertFalse(board.containsKey("E"));

        // LIFO: UndoService chọn U1 trước (Task 8); ở đây gọi theo đúng thứ tự đó
        HistoryMath.InverseResult redoT1 = run(REDO, t1, u1);
        assertTrue(redoT1.skipped().isEmpty());
        assertEquals("create", redoT1.intents().get(0).kind());
        apply(redoT1, ALICE);
        assertX("E", 0.0, 10);

        HistoryMath.InverseResult redoT2 = run(REDO, t2, u2);
        assertTrue(redoT2.skipped().isEmpty());
        apply(redoT2, ALICE);
        assertTrue(board.containsKey("E"));
        assertX("E", 100.0, 11);
    }

    @Test
    void example4_patchDeleteUndoDeleteThenUndoPatch() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t1 = userPatch(ALICE, "S", "x", 100.0);         // seq 10
        List<BoardOp> t2 = userDelete(ALICE, "S");                     // seq 11

        HistoryMath.InverseResult undoDelete = run(UNDO, t2, null);
        assertTrue(undoDelete.skipped().isEmpty());
        assertEquals("create", undoDelete.intents().get(0).kind());
        apply(undoDelete, ALICE);
        assertX("S", 100.0, 10);                                       // fieldSeq được khôi phục

        HistoryMath.InverseResult undoPatch = run(UNDO, t1, null);
        assertTrue(undoPatch.skipped().isEmpty());
        apply(undoPatch, ALICE);
        assertX("S", 0.0, 0);
    }

    @Test
    void example5_connectorRetargetUndoEndMissing() {
        board.put("E", shape("E", 0.0));
        board.put("F", shape("F", 200.0));
        board.put("G", shape("G", 400.0));
        board.put("C", connector("C", "E", "F"));
        List<BoardOp> t = userPatch(ALICE, "C", "connector", conn("E", "G"));
        userDelete(BOB, "F");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("C", "connector", "end-missing", null)), r.skipped());
    }

    @Test
    void example6_redoAfterOwnNewActionProducesNoIntent() {
        // "empty" do UndoService trả (Task 8: post-commit đã chuyển T sang dead); ở mức math,
        // thao tác mới (user hoặc restore) đổi "dấu" nên redo cũng không sinh intent
        board.put("S", shape("S", 0.0));
        List<BoardOp> t1 = userPatch(ALICE, "S", "x", 100.0);
        List<BoardOp> u1 = apply(run(UNDO, t1, null), ALICE);
        userPatch(ALICE, "S", "x", 50.0);

        HistoryMath.InverseResult r = run(REDO, t1, u1);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", "x", "modified", null)), r.skipped());
        assertX("S", 50.0, 12);
    }

    // ---------- Review Focus 4 / 5 ----------

    @Test
    void imageDeleteUndoKeepsImagePayload() {
        board.put("I", imageEl("I"));
        List<BoardOp> t = userDelete(ALICE, "I");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.skipped().isEmpty());
        assertEquals(1, r.intents().size());
        Intent in = r.intents().get(0);
        assertEquals("create", in.kind());
        assertEquals("I", in.elementId());
        assertEquals("image", in.element().get("type"));
        Object original = t.get(0).getBefore().get("image");
        assertEquals(original, in.element().get("image"));
        assertNotSame(original, in.element().get("image"));
    }

    @Test
    void legacyElementWithoutFieldSeqCountsAsZero() {
        Map<String, Object> s = shape("S", 100.0);
        s.put("fieldSeq", map("x", 10L));                              // legacy: chỉ key vừa patch có dấu
        board.put("S", s);
        List<BoardOp> t = List.of(op("t0", ALICE, "patch", "S", map("x", 0.0), map("x", 100.0),
                null, Map.of("x", 10L), 1L));                          // fsBefore thiếu = 0

        HistoryMath.InverseResult undo = run(UNDO, t, null);
        assertTrue(undo.skipped().isEmpty());
        Intent in = undo.intents().get(0);
        assertEquals(0.0, ((Number) in.set().get("x")).doubleValue());
        assertEquals(Map.of("x", 0L), in.fsOverride());

        // element hoàn toàn không có field fieldSeq: redo cần fs == T.fsB = 0
        board.get("S").remove("fieldSeq");
        board.get("S").put("x", 0.0);
        HistoryMath.InverseResult redo = run(REDO, t, List.of());
        assertTrue(redo.skipped().isEmpty());
        assertEquals(100.0, ((Number) redo.intents().get(0).set().get("x")).doubleValue());
        assertEquals(Map.of("x", 10L), redo.intents().get(0).fsOverride());
    }

    // ---------- gộp theo element / key ----------

    @Test
    void groupCreateThenPatchUndoIsSingleDelete() {
        List<BoardOp> t = concat(userCreate(ALICE, shape("E", 0.0)), userPatch(ALICE, "E", "x", 100.0));

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.skipped().isEmpty());
        assertEquals(1, r.intents().size());
        assertEquals("delete", r.intents().get(0).kind());
        assertEquals("E", r.intents().get(0).elementId());
    }

    @Test
    void groupCreateThenDeleteCancels() {
        List<BoardOp> t = concat(userCreate(ALICE, shape("E", 0.0)), userDelete(ALICE, "E"));

        HistoryMath.InverseResult undo = run(UNDO, t, null);
        HistoryMath.InverseResult redo = run(REDO, t, List.of());

        assertTrue(undo.intents().isEmpty());
        assertTrue(undo.skipped().isEmpty());
        assertTrue(redo.intents().isEmpty());
        assertTrue(redo.skipped().isEmpty());
    }

    @Test
    void groupPatchPatchUsesEarliestBeforeAndLatestAfter() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = concat(userPatch(ALICE, "S", "x", 100.0),   // seq 10, fsB 0
                userPatch(ALICE, "S", "x", 200.0));                    // seq 11, fsA 11

        HistoryMath.InverseResult undo = run(UNDO, t, null);
        assertTrue(undo.skipped().isEmpty());
        assertEquals(1, undo.intents().size());
        assertEquals(0.0, ((Number) undo.intents().get(0).set().get("x")).doubleValue());
        assertEquals(Map.of("x", 0L), undo.intents().get(0).fsOverride());
        List<BoardOp> u = apply(undo, ALICE);

        HistoryMath.InverseResult redo = run(REDO, t, u);
        assertTrue(redo.skipped().isEmpty());
        assertEquals(200.0, ((Number) redo.intents().get(0).set().get("x")).doubleValue());
        assertEquals(Map.of("x", 11L), redo.intents().get(0).fsOverride());
    }

    @Test
    void groupPatchThenDeleteUndoRecreatesPreTxState() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = concat(userPatch(ALICE, "S", "x", 100.0), userDelete(ALICE, "S"));

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.skipped().isEmpty());
        assertEquals(1, r.intents().size());
        Intent in = r.intents().get(0);
        assertEquals("create", in.kind());
        assertEquals(0.0, ((Number) in.element().get("x")).doubleValue());
        assertEquals(0L, ((Number) ((Map<?, ?>) in.element().get("fieldSeq")).get("x")).longValue());
    }

    // ---------- các dòng còn lại của bảng §7.2 ----------

    @Test
    void undoCreateBlockedByOtherUserConnectorAttached() {
        board.put("F", shape("F", 200.0));
        List<BoardOp> t = userCreate(ALICE, shape("E", 0.0));
        userCreate(BOB, connector("C", "E", "F"));

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("E", null, "modified", BOB)), r.skipped());
    }

    @Test
    void undoDeleteSkipsConnectorWhoseOtherEndIsGone() {
        board.put("E", shape("E", 0.0));
        board.put("F", shape("F", 200.0));
        board.put("C", connector("C", "E", "F"));
        List<BoardOp> t = userDelete(ALICE, "E", "C");                 // delete + cascade trong cùng tx
        userDelete(BOB, "F");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertEquals(1, r.intents().size());
        assertEquals("create", r.intents().get(0).kind());
        assertEquals("E", r.intents().get(0).elementId());
        assertEquals(List.of(new HistoryResult.Skip("C", null, "end-missing", null)), r.skipped());
    }

    @Test
    void undoDeleteRecreatesNodeBeforeConnector() {
        board.put("E", shape("E", 0.0));
        board.put("F", shape("F", 200.0));
        board.put("C", connector("C", "E", "F"));
        List<BoardOp> t = userDelete(ALICE, "E", "C");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.skipped().isEmpty());
        assertEquals(List.of("E", "C"), r.intents().stream().map(Intent::elementId).toList());
        assertTrue(r.intents().stream().allMatch(i -> "create".equals(i.kind())));
    }

    @Test
    void redoDeleteBlockedByOtherUserAfterUndo() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userDelete(ALICE, "S");
        List<BoardOp> u = apply(run(UNDO, t, null), ALICE);
        userPatch(BOB, "S", "x", 5.0);

        HistoryMath.InverseResult r = run(REDO, t, u);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", null, "modified", BOB)), r.skipped());
    }

    @Test
    void undoPatchOnDeletedElementSkipsGone() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userPatch(ALICE, "S", "x", 100.0);
        userDelete(BOB, "S");

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", null, "gone", BOB)), r.skipped());
    }

    @Test
    void undoDeleteWhenIdExistsSkipsExists() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userDelete(ALICE, "S");
        userCreate(BOB, shape("S", 0.0));

        HistoryMath.InverseResult r = run(UNDO, t, null);

        assertTrue(r.intents().isEmpty());
        assertEquals(List.of(new HistoryResult.Skip("S", null, "exists", BOB)), r.skipped());
    }

    @Test
    void inverseDoesNotMutateInputs() {
        board.put("S", shape("S", 0.0));
        List<BoardOp> t = userPatch(ALICE, "S", "x", 100.0);
        Map<String, Map<String, Object>> before = copy(board);
        Map<String, Object> opBefore = copy(t.get(0).getBefore());

        run(UNDO, t, null);

        assertEquals(before, board);
        assertEquals(opBefore, t.get(0).getBefore());
    }
}
