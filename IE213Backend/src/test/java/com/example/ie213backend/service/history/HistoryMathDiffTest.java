package com.example.ie213backend.service.history;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class HistoryMathDiffTest {

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

    private static Map<String, Object> connector(String id, String from, String to) {
        Map<String, Object> c = el(id, "connector", 0.0);
        c.put("connector", conn(from, to));
        return c;
    }

    private static Map<String, Object> conn(String from, String to) {
        return Map.of("from", Map.of("elementId", from, "anchor", "auto"),
                "to", Map.of("elementId", to, "anchor", "auto"));
    }

    private static Map<String, Object> image(String id, String url) {
        Map<String, Object> e = el(id, "image", 0.0);
        Map<String, Object> img = new LinkedHashMap<>();
        img.put("url", url);
        img.put("cloudinaryId", "cld-" + url);
        img.put("alt", null);
        e.put("image", img);
        return e;
    }

    private static Map<String, Map<String, Object>> board(Map<String, Object>... els) {
        Map<String, Map<String, Object>> b = new LinkedHashMap<>();
        for (Map<String, Object> e : els) b.put((String) e.get("id"), e);
        return b;
    }

    private static Intent find(List<Intent> intents, String kind, String id) {
        return intents.stream()
                .filter(i -> kind.equals(i.kind()) && id.equals(i.elementId()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("missing " + kind + " " + id + " in " + intents));
    }

    @Test
    void elementOnlyInCurrentIsDeleted() {
        List<Intent> out = HistoryMath.diff(board(el("E", "sticky", 0.0)),
                board(el("E", "sticky", 0.0), el("G", "sticky", 0.0)));
        assertEquals(1, out.size());
        find(out, "delete", "G");
    }

    @Test
    void elementOnlyInTargetIsCreatedKeepingId() {
        Map<String, Object> f = el("F", "sticky", 30.0);
        f.put("text", "hi");
        List<Intent> out = HistoryMath.diff(board(el("E", "sticky", 0.0), f), board(el("E", "sticky", 0.0)));
        assertEquals(1, out.size());
        Intent create = find(out, "create", "F");
        assertEquals("F", create.element().get("id"));
        assertEquals(30.0, create.element().get("x"));
        assertEquals("hi", create.element().get("text"));
        assertNotSame(f, create.element());
    }

    @Test
    void bothPresentPatchesOnlyDifferingKeysWithTargetValues() {
        Map<String, Object> target = el("E", "sticky", 100.0);
        target.put("text", "old");
        Map<String, Object> current = el("E", "sticky", 0.0);
        current.put("text", "new");
        List<Intent> out = HistoryMath.diff(board(target), board(current));
        assertEquals(1, out.size());
        Intent patch = find(out, "patch", "E");
        assertEquals(Map.of("x", 100.0, "text", "old"), patch.set());
    }

    @Test
    void patchCanClearKeyToNull() {
        Map<String, Object> current = el("E", "sticky", 0.0);
        current.put("style", Map.of("fill", "#000"));
        List<Intent> out = HistoryMath.diff(board(el("E", "sticky", 0.0)), board(current));
        Intent patch = find(out, "patch", "E");
        assertEquals(1, patch.set().size());
        assertTrue(patch.set().containsKey("style"));
        assertNull(patch.set().get("style"));
    }

    @Test
    void ignoresNonPatchableMetadata() {
        Map<String, Object> target = el("E", "sticky", 0.0);
        Map<String, Object> current = el("E", "sticky", 0.0);
        current.put("version", 42L);
        current.put("updateAt", "2026-09-25 10:00:00");
        current.put("owner", "someone-else");
        current.put("migratedFrom", "stickyNote");
        current.put("boardId", "650000000000000000000001");
        current.put("fieldSeq", Map.of("x", 99L));
        assertTrue(HistoryMath.diff(board(target), board(current)).isEmpty());
    }

    @Test
    void intVersusDoubleGivesNoSpuriousPatch() {
        Map<String, Object> target = el("E", "sticky", 100.0);
        Map<String, Object> styleT = new HashMap<>();
        styleT.put("fill", "#fff");
        styleT.put("stroke", null);
        styleT.put("strokeWidth", 2.0);
        styleT.put("fontSize", 12.0);
        target.put("style", styleT);

        Map<String, Object> current = el("E", "sticky", 0.0);
        current.put("x", 100);
        current.put("z", 1);
        Map<String, Object> styleC = new HashMap<>();
        styleC.put("fill", "#fff");
        styleC.put("stroke", null);
        styleC.put("strokeWidth", 2);
        styleC.put("fontSize", 12);
        current.put("style", styleC);

        assertTrue(HistoryMath.diff(board(target), board(current)).isEmpty());
    }

    @Test
    void emptyDiff() {
        assertTrue(HistoryMath.diff(board(), board()).isEmpty());
        assertTrue(HistoryMath.diff(
                board(el("E", "sticky", 5.0), connector("C", "E", "E")),
                board(el("E", "sticky", 5.0), connector("C", "E", "E"))).isEmpty());
    }

    @Test
    void imageChangeGivesDeleteAndCreateWithImageIntact() {
        Map<String, Object> target = image("I", "a.png");
        List<Intent> out = HistoryMath.diff(board(target), board(image("I", "b.png")));
        assertEquals(2, out.size());
        find(out, "delete", "I");
        assertEquals(1, out.indexOf(find(out, "create", "I")) - out.indexOf(find(out, "delete", "I")), "delete ngay trước create");
        Intent create = find(out, "create", "I");
        assertEquals(target.get("image"), create.element().get("image"));
        assertEquals("image", create.element().get("type"));
        assertTrue(out.stream().noneMatch(i -> "patch".equals(i.kind())));
    }

    @Test
    void typeChangeGivesDeleteAndCreate() {
        List<Intent> out = HistoryMath.diff(board(el("E", "shape", 0.0)), board(el("E", "sticky", 0.0)));
        assertEquals(2, out.size());
        find(out, "delete", "E");
        assertEquals(1, out.indexOf(find(out, "create", "E")) - out.indexOf(find(out, "delete", "E")), "delete ngay trước create");
        assertEquals("shape", find(out, "create", "E").element().get("type"));
    }

    @Test
    void connectorRepointedToElementCreatedAfterN() {
        // tại N: C nối E→F; sau N: tạo G rồi đổi C sang E→G
        Map<String, Map<String, Object>> target = board(el("E", "sticky", 0.0), el("F", "sticky", 0.0),
                connector("C", "E", "F"));
        Map<String, Map<String, Object>> current = board(el("E", "sticky", 0.0), el("F", "sticky", 0.0),
                el("G", "sticky", 0.0), connector("C", "E", "G"));
        List<Intent> out = HistoryMath.diff(target, current);
        assertEquals(2, out.size());
        find(out, "delete", "G");
        Intent patch = find(out, "patch", "C");
        assertEquals(Map.of("connector", conn("E", "F")), patch.set());
    }

    @Test
    void connectorPointingToElementDeletedAfterN() {
        // tại N: E, F, C(E→F); sau N: xóa F (cascade xóa C)
        Map<String, Map<String, Object>> target = board(el("E", "sticky", 0.0), el("F", "sticky", 0.0),
                connector("C", "E", "F"));
        Map<String, Map<String, Object>> current = board(el("E", "sticky", 0.0));
        List<Intent> out = HistoryMath.diff(target, current);
        assertEquals(2, out.size());
        find(out, "create", "F");
        Intent c = find(out, "create", "C");
        assertEquals(conn("E", "F"), c.element().get("connector"));
        assertTrue(out.stream().noneMatch(i -> "delete".equals(i.kind())));
    }

    @Test
    void doesNotMutateInputs() {
        Map<String, Map<String, Object>> target = board(el("E", "sticky", 100.0));
        Map<String, Map<String, Object>> current = board(el("E", "sticky", 0.0), el("G", "sticky", 0.0));
        HistoryMath.diff(target, current);
        assertEquals(100.0, target.get("E").get("x"));
        assertEquals(0.0, current.get("E").get("x"));
        assertEquals(2, current.size());
    }
}
