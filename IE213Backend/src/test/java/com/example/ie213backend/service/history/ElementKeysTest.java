package com.example.ie213backend.service.history;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ElementKeysTest {
    @Test
    void kIsExactlyTheTenPatchableKeys() {
        assertEquals(List.of("x", "y", "w", "h", "rotation", "z", "text", "style", "shape", "connector"), ElementKeys.K);
    }

    @Test
    void isConnectorChecksType() {
        assertTrue(ElementKeys.isConnector(Map.of("type", "connector")));
        assertFalse(ElementKeys.isConnector(Map.of("type", "sticky")));
        assertFalse(ElementKeys.isConnector(Map.of()));
        assertFalse(ElementKeys.isConnector(null));
    }

    @Test
    void connectorEndsReturnsFromThenTo() {
        Map<String, Object> c = Map.of(
                "from", Map.of("elementId", "a", "anchor", "auto"),
                "to", Map.of("elementId", "b", "anchor", "right"));
        assertEquals(List.of("a", "b"), ElementKeys.connectorEnds(c));
    }

    @Test
    void connectorEndsToleratesNullAndMissingEnds() {
        assertEquals(List.of(), ElementKeys.connectorEnds(null));
        Map<String, Object> half = new HashMap<>();
        half.put("from", Map.of("elementId", "a", "anchor", "auto"));
        half.put("to", null);
        assertEquals(List.of("a"), ElementKeys.connectorEnds(half));
    }

    @Test
    void intentFactoriesFillTheRightFields() {
        Map<String, Object> full = Map.of("id", "e1", "type", "sticky");
        Intent c = Intent.create(full);
        assertEquals("create", c.kind());
        assertEquals("e1", c.elementId());
        assertSame(full, c.element());
        assertNull(c.set());
        assertNull(c.fsOverride());

        Map<String, Object> set = Map.of("x", 1.0);
        Intent p = Intent.patch("e1", set);
        assertEquals("patch", p.kind());
        assertEquals("e1", p.elementId());
        assertNull(p.element());
        assertSame(set, p.set());
        assertNull(p.fsOverride());

        Map<String, Long> fs = Map.of("x", 10L);
        Intent pf = Intent.patch("e1", set, fs);
        assertEquals("patch", pf.kind());
        assertSame(fs, pf.fsOverride());

        Intent d = Intent.delete("e1");
        assertEquals("delete", d.kind());
        assertEquals("e1", d.elementId());
        assertNull(d.element());
        assertNull(d.set());
        assertNull(d.fsOverride());
    }
}
