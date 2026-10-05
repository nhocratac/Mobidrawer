package com.example.ie213backend.service.history;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HistoryResultTest {
    @Test
    void emptyHasSingleEmptySkip() {
        HistoryResult r = HistoryResult.empty("undo");
        assertEquals("undo", r.op());
        assertEquals(0, r.applied());
        assertEquals(List.of(new HistoryResult.Skip(null, null, "empty", null)), r.skipped());
    }

    @Test
    void serializesToQueueHistoryShape() throws Exception {
        HistoryResult r = new HistoryResult("redo", 1,
                List.of(new HistoryResult.Skip("S", "x", "modified", "bob")));
        String json = new ObjectMapper().writeValueAsString(r);
        assertTrue(json.contains("\"op\":\"redo\""), json);
        assertTrue(json.contains("\"applied\":1"), json);
        assertTrue(json.contains("\"elementId\":\"S\""), json);
        assertTrue(json.contains("\"key\":\"x\""), json);
        assertTrue(json.contains("\"reason\":\"modified\""), json);
        assertTrue(json.contains("\"byUserId\":\"bob\""), json);
    }
}
