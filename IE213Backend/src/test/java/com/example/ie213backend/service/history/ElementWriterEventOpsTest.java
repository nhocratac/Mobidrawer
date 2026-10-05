package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardOp;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ElementWriterEventOpsTest {
    private BoardOp op(String kind, String id, Map<String, Object> after, long v) {
        BoardOp op = new BoardOp();
        op.setKind(kind);
        op.setElementId(id);
        op.setAfter(after);
        op.setV(v);
        return op;
    }

    @Test
    void groupsConsecutiveSameKindOpsInOrder() {
        Map<String, Object> a = Map.of("id", "a", "type", "shape");
        Map<String, Object> b = Map.of("id", "b", "type", "shape");
        Map<String, Object> conn = Map.of("id", "conn", "type", "connector");
        List<BoardOp> ops = List.of(
                op("create", "a", a, 1),
                op("create", "b", b, 1),
                op("patch", "c", Map.of("x", 5.0), 4),
                op("patch", "d", Map.of("text", "hi"), 2),
                op("create", "conn", conn, 1),
                op("delete", "e", null, 3),
                op("delete", "f", null, 1));

        List<Map<String, Object>> out = ElementWriter.eventOps(ops);

        assertEquals(List.of("create", "patch", "create", "delete"), out.stream().map(g -> g.get("op")).toList());
        assertEquals(List.of(a, b), out.get(0).get("elements"));
        assertEquals(List.of(
                Map.of("id", "c", "set", Map.of("x", 5.0), "version", 4L),
                Map.of("id", "d", "set", Map.of("text", "hi"), "version", 2L)), out.get(1).get("patches"));
        assertEquals(List.of(conn), out.get(2).get("elements"), "create connector không gộp với create đầu vì bị patch chen giữa");
        assertEquals(List.of("e", "f"), out.get(3).get("ids"));
    }

    @Test
    void emptyOpsGiveEmptyList() {
        assertTrue(ElementWriter.eventOps(List.of()).isEmpty());
    }
}
