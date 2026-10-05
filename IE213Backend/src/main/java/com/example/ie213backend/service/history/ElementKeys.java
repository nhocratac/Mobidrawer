package com.example.ie213backend.service.history;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// Các key patch được (K) và helper đọc connector ở dạng Map chuẩn hóa
public final class ElementKeys {
    public static final List<String> K = List.of("x", "y", "w", "h", "rotation", "z", "text", "style", "shape", "connector");

    private ElementKeys() {
    }

    public static boolean isConnector(Map<String, Object> el) {
        return el != null && "connector".equals(el.get("type"));
    }

    public static List<String> connectorEnds(Map<String, Object> connectorValue) {
        if (connectorValue == null) return List.of();
        List<String> ids = new ArrayList<>(2);
        for (String end : List.of("from", "to")) {
            if (connectorValue.get(end) instanceof Map<?, ?> m && m.get("elementId") instanceof String id) ids.add(id);
        }
        return List.copyOf(ids);
    }
}
