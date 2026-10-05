package com.example.ie213backend.service.element;

import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.query.Update;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ElementPatchesTest {
    @Test
    void whitelistsGeometryAndBumpsVersion() {
        Update u = ElementPatches.toUpdate(Map.of("x", 10, "y", 20.5));
        Document set = (Document) u.getUpdateObject().get("$set");
        assertEquals(10.0, ((Number) set.get("x")).doubleValue());
        assertEquals(20.5, ((Number) set.get("y")).doubleValue());
        assertEquals(1, ((Document) u.getUpdateObject().get("$inc")).get("version"));
    }

    @Test
    void rejectsUnknownKey() {
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of("boardId", "x")));
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of("owner", "x")));
    }

    @Test
    void rejectsNonNumericGeometry() {
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of("w", "100px")));
    }

    @Test
    void rejectsEmptySet() {
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of()));
    }

    @Test
    void validatesConnector() {
        Map<String, Object> bad = Map.of("connector", Map.of(
                "from", Map.of("elementId", "a", "anchor", "auto"),
                "to", Map.of("elementId", "a", "anchor", "auto")));
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(bad));
    }

    @Test
    void rejectsTooLongText() {
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of("text", "x".repeat(10_001))));
    }

    @Test
    void rejectsUnknownShapeKind() {
        assertThrows(IllegalArgumentException.class, () -> ElementPatches.toUpdate(Map.of("shape", Map.of("kind", "star"))));
    }
}
