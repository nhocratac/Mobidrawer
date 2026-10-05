package com.example.ie213backend.service.history;

import java.util.List;

// Kết quả undo/redo/restore gửi về /user/queue/history
public record HistoryResult(String op, int applied, List<Skip> skipped) {

    // reason: modified | gone | exists | end-missing | empty
    public record Skip(String elementId, String key, String reason, String byUserId) {
    }

    public static HistoryResult empty(String op) {
        return new HistoryResult(op, 0, List.of(new Skip(null, null, "empty", null)));
    }
}
