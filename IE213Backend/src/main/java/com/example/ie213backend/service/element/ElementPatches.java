package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.mongodb.core.query.Update;

import java.util.List;
import java.util.Map;
import java.util.Set;

// Chuyển patch từ client thành Mongo Update, chỉ cho phép các field được whitelist
public final class ElementPatches {
    public record ElementPatch(String id, Map<String, Object> set) {
    }

    // mergeKey tuỳ chọn: các patch gõ chữ cùng key trong 3s được gộp thành 1 tx để undo một lần
    public record PatchBody(List<ElementPatch> patches, String mergeKey) {
    }

    private static final Set<String> GEOMETRY = Set.of("x", "y", "w", "h", "rotation", "z");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ElementPatches() {
    }

    public static Update toUpdate(Map<String, Object> set) {
        if (set == null || set.isEmpty()) throw new IllegalArgumentException("empty patch");
        Update update = new Update();
        set.forEach((key, value) -> {
            if (GEOMETRY.contains(key)) {
                if (!(value instanceof Number n) || !Double.isFinite(n.doubleValue()))
                    throw new IllegalArgumentException(key + " must be a number");
                update.set(key, n.doubleValue());
                return;
            }
            switch (key) {
                case "text" -> {
                    if (value != null && !(value instanceof String))
                        throw new IllegalArgumentException("text must be a string");
                    ElementValidator.validateText((String) value);
                    update.set("text", value);
                }
                case "style" -> update.set("style", convert(value, BoardElement.Style.class));
                case "shape" -> {
                    BoardElement.ShapeData shape = convert(value, BoardElement.ShapeData.class);
                    ElementValidator.validateShape(shape);
                    update.set("shape", shape);
                }
                case "connector" -> {
                    BoardElement.ConnectorData connector = convert(value, BoardElement.ConnectorData.class);
                    ElementValidator.validateConnector(connector);
                    update.set("connector", connector);
                }
                default -> throw new IllegalArgumentException("field not allowed: " + key);
            }
        });
        update.inc("version", 1);
        update.currentDate("updateAt");
        return update;
    }

    public static BoardElement.ConnectorData toConnector(Object value) {
        return convert(value, BoardElement.ConnectorData.class);
    }

    private static <T> T convert(Object value, Class<T> type) {
        if (value == null) return null;
        try {
            return MAPPER.convertValue(value, type);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("invalid " + type.getSimpleName());
        }
    }
}
