package com.example.ie213backend.service.history;

import java.util.Map;

// Ý định ghi: create mang element đầy đủ (chuẩn hóa), patch mang set chuẩn hóa; fsOverride chỉ dùng cho undo/redo
public record Intent(String kind, String elementId, Map<String, Object> element,
                     Map<String, Object> set, Map<String, Long> fsOverride) {

    public static Intent create(Map<String, Object> fullElement) {
        return new Intent("create", (String) fullElement.get("id"), fullElement, null, null);
    }

    public static Intent patch(String id, Map<String, Object> set) {
        return new Intent("patch", id, null, set, null);
    }

    public static Intent patch(String id, Map<String, Object> set, Map<String, Long> fsOverride) {
        return new Intent("patch", id, null, set, fsOverride);
    }

    public static Intent delete(String id) {
        return new Intent("delete", id, null, null, null);
    }
}
