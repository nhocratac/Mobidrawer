package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardElement;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SuppressWarnings("unchecked")
class ElementNormalizerTest {
    private static final String BOARD = "650000000000000000000009";
    private static final String OWNER = "650000000000000000000008";

    private BoardElement image(String id) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setBoardId(BOARD);
        e.setOwner(OWNER);
        e.setType("image");
        e.setX(10);
        e.setY(20);
        e.setW(300);
        e.setH(200);
        e.setZ(3);
        e.setImage(new BoardElement.ImageData("https://img/a.png", "cid-1", "alt"));
        e.setStyle(new BoardElement.Style("#fff", null, 2.0, null));
        e.setVersion(4);
        e.setFieldSeq(new HashMap<>(Map.of("x", 12L, "style", 7L)));
        return e;
    }

    private BoardElement connector(String id, String from, String to) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setBoardId(BOARD);
        e.setType("connector");
        e.setConnector(new BoardElement.ConnectorData(
                new BoardElement.End(from, "auto"), new BoardElement.End(to, "right")));
        return e;
    }

    @Test
    void normalizeSetConvertsIntGeometryToDouble() {
        Map<String, Object> out = ElementNormalizer.normalizeSet(Map.of("x", 100, "z", 2));
        assertEquals(2, out.size());
        assertEquals(Double.class, out.get("x").getClass());
        assertEquals(100.0, out.get("x"));
        assertEquals(2.0, out.get("z"));
    }

    @Test
    void sameTreatsIntAndDoubleAsEqual() {
        assertTrue(ElementNormalizer.same(100, 100.0));
        assertTrue(ElementNormalizer.same(3L, 3));
        assertTrue(ElementNormalizer.same(Map.of("x", 100), Map.of("x", 100.0)));
        assertTrue(ElementNormalizer.same(List.of(1, 2L), List.of(1.0, 2.0)));
        assertFalse(ElementNormalizer.same(100, 100.5));
        assertFalse(ElementNormalizer.same(100, "100"));
        assertFalse(ElementNormalizer.same(List.of(1), List.of(1, 2)));
        assertTrue(ElementNormalizer.same(null, null));
        assertFalse(ElementNormalizer.same(null, 0));
    }

    @Test
    void sameComparesNestedMapsDeeplyAndMissingKeyEqualsNull() {
        Map<String, Object> withNull = new HashMap<>();
        withNull.put("fill", "#fff");
        withNull.put("stroke", null);
        assertTrue(ElementNormalizer.same(withNull, Map.of("fill", "#fff")));
        assertFalse(ElementNormalizer.same(withNull, Map.of("fill", "#000")));
        assertTrue(ElementNormalizer.same(
                Map.of("from", Map.of("elementId", "a", "w", 1)),
                Map.of("from", Map.of("elementId", "a", "w", 1.0))));
        assertFalse(ElementNormalizer.same(
                Map.of("from", Map.of("elementId", "a")),
                Map.of("from", Map.of("elementId", "b"))));
    }

    @Test
    void normalizeSetStyleKeepsNullsAndDoubles() {
        Map<String, Object> out = ElementNormalizer.normalizeSet(
                Map.of("style", Map.of("fill", "#fff", "strokeWidth", 2)));
        Map<String, Object> style = (Map<String, Object>) out.get("style");
        assertEquals(Set.of("fill", "stroke", "strokeWidth", "fontSize"), style.keySet());
        assertNull(style.get("stroke"));
        assertNull(style.get("fontSize"));
        assertEquals(2.0, style.get("strokeWidth"));
        // style từ patch phải khớp style từ element đã lưu
        BoardElement e = image("650000000000000000000001");
        assertEquals(style, ElementNormalizer.full(e).get("style"));
    }

    @Test
    void normalizeSetKeepsNullTextAndNullStyle() {
        Map<String, Object> set = new HashMap<>();
        set.put("text", null);
        set.put("style", null);
        Map<String, Object> out = ElementNormalizer.normalizeSet(set);
        assertTrue(out.containsKey("text"));
        assertNull(out.get("text"));
        assertTrue(out.containsKey("style"));
        assertNull(out.get("style"));
    }

    @Test
    void connectorBecomesNestedMap() {
        Map<String, Object> set = Map.of("connector", Map.of(
                "from", Map.of("elementId", "a", "anchor", "auto"),
                "to", Map.of("elementId", "b", "anchor", "right")));
        Map<String, Object> c = (Map<String, Object>) ElementNormalizer.normalizeSet(set).get("connector");
        assertEquals(Map.of("elementId", "a", "anchor", "auto"), c.get("from"));
        assertEquals(Map.of("elementId", "b", "anchor", "right"), c.get("to"));
        assertEquals(List.of("a", "b"), ElementKeys.connectorEnds(c));

        Map<String, Object> full = ElementNormalizer.full(connector("650000000000000000000003", "a", "b"));
        assertTrue(ElementKeys.isConnector(full));
        assertEquals(c, full.get("connector"));
    }

    @Test
    void fullHasEveryKeyWithNormalizedTypes() {
        Map<String, Object> m = ElementNormalizer.full(image("650000000000000000000001"));
        Set<String> expected = new HashSet<>(ElementKeys.K);
        expected.addAll(Set.of("id", "type", "boardId", "owner", "image", "migratedFrom", "fieldSeq", "version"));
        assertEquals(expected, m.keySet());
        assertEquals("650000000000000000000001", m.get("id"));
        assertEquals(BOARD, m.get("boardId"));
        assertEquals(OWNER, m.get("owner"));
        assertEquals(Double.class, m.get("x").getClass());
        assertEquals(10.0, m.get("x"));
        assertEquals(0.0, m.get("rotation"));
        assertEquals(4L, m.get("version"));
        assertNull(m.get("text"));
        assertNull(m.get("shape"));
        assertNull(m.get("connector"));
        assertNull(m.get("migratedFrom"));
        assertEquals(Map.of("x", 12L, "style", 7L), m.get("fieldSeq"));
        assertEquals(Map.of("url", "https://img/a.png", "cloudinaryId", "cid-1", "alt", "alt"), m.get("image"));
    }

    @Test
    void imageSurvivesFullToElementRoundTrip() {
        BoardElement src = image("650000000000000000000001");
        Map<String, Object> full = ElementNormalizer.full(src);
        BoardElement back = ElementNormalizer.toElement(full);
        assertEquals(src.getImage(), back.getImage());
        assertEquals(src.getStyle(), back.getStyle());
        assertEquals(src.getId(), back.getId());
        assertEquals(src.getBoardId(), back.getBoardId());
        assertEquals(src.getOwner(), back.getOwner());
        assertEquals("image", back.getType());
        assertEquals(10.0, back.getX());
        assertEquals(3.0, back.getZ());
        assertEquals(4L, back.getVersion());
        assertEquals(Map.of("x", 12L, "style", 7L), back.getFieldSeq());
        assertTrue(ElementNormalizer.same(full, ElementNormalizer.full(back)));
    }

    @Test
    void toElementAcceptsIntegerNumbersFromMongo() {
        Map<String, Object> m = new HashMap<>(ElementNormalizer.full(image("650000000000000000000001")));
        m.put("x", 5);
        m.put("version", 3);
        m.put("fieldSeq", Map.of("x", 9));
        BoardElement e = ElementNormalizer.toElement(m);
        assertEquals(5.0, e.getX());
        assertEquals(3L, e.getVersion());
        assertEquals(Map.of("x", 9L), e.getFieldSeq());
    }

    @Test
    void legacyElementWithoutFieldSeqGetsEmptyMap() {
        BoardElement e = new BoardElement();
        e.setId("650000000000000000000002");
        e.setBoardId(BOARD);
        e.setType("sticky");
        e.setText("hi");
        e.setMigratedFrom("stickyNote");
        Map<String, Object> m = ElementNormalizer.full(e);
        assertEquals(Map.of(), m.get("fieldSeq"));
        assertEquals(0L, m.get("version"));
        assertNull(m.get("image"));
        assertEquals("stickyNote", m.get("migratedFrom"));
        assertEquals(Map.of(), ElementNormalizer.toElement(m).getFieldSeq());
    }

    @Test
    void normalizeSetRejectsInvalidKeysAndValues() {
        assertThrows(IllegalArgumentException.class,
                () -> ElementNormalizer.normalizeSet(Map.of("image", Map.of("url", "https://x"))));
        assertThrows(IllegalArgumentException.class,
                () -> ElementNormalizer.normalizeSet(Map.of("fieldSeq", Map.of("x", 1))));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(Map.of("version", 9)));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(Map.of("type", "shape")));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(Map.of("x", "10px")));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(Map.of()));
        assertThrows(IllegalArgumentException.class, () -> ElementNormalizer.normalizeSet(null));
    }
}
