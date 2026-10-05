package com.example.ie213backend.service.history;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.service.element.ElementPatches;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.Document;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

// Dạng Map chuẩn hóa của element (spec §5): geometry là Double, POJO -> Map giữ cả null
public final class ElementNormalizer {
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<LinkedHashMap<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final Set<String> POJO_KEYS = Set.of("style", "shape", "connector");

    private ElementNormalizer() {
    }

    public static Map<String, Object> full(BoardElement e) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", e.getId());
        m.put("type", e.getType());
        m.put("boardId", e.getBoardId());
        m.put("owner", e.getOwner());
        m.put("image", toMap(e.getImage()));
        m.put("migratedFrom", e.getMigratedFrom());
        m.put("x", e.getX());
        m.put("y", e.getY());
        m.put("w", e.getW());
        m.put("h", e.getH());
        m.put("rotation", e.getRotation());
        m.put("z", e.getZ());
        m.put("text", e.getText());
        m.put("style", toMap(e.getStyle()));
        m.put("shape", toMap(e.getShape()));
        m.put("connector", toMap(e.getConnector()));
        // element cũ chưa có fieldSeq thì coi như mọi key = 0
        m.put("fieldSeq", fieldSeq(e.getFieldSeq()));
        m.put("version", e.getVersion());
        return m;
    }

    public static Map<String, Object> normalizeSet(Map<String, Object> set) {
        // toUpdate kiểm key ∈ K và kiểu giá trị; lấy lại đúng giá trị nó ghi vào $set
        Document applied = (Document) ElementPatches.toUpdate(set).getUpdateObject().get("$set");
        Map<String, Object> out = new LinkedHashMap<>();
        applied.forEach((key, value) -> out.put(key, POJO_KEYS.contains(key) ? toMap(value) : value));
        return out;
    }

    public static BoardElement toElement(Map<String, Object> full) {
        BoardElement e = new BoardElement();
        e.setId((String) full.get("id"));
        e.setType((String) full.get("type"));
        e.setBoardId((String) full.get("boardId"));
        e.setOwner((String) full.get("owner"));
        e.setImage(fromMap(full.get("image"), BoardElement.ImageData.class));
        e.setMigratedFrom((String) full.get("migratedFrom"));
        e.setX(num(full.get("x")));
        e.setY(num(full.get("y")));
        e.setW(num(full.get("w")));
        e.setH(num(full.get("h")));
        e.setRotation(num(full.get("rotation")));
        e.setZ(num(full.get("z")));
        e.setText((String) full.get("text"));
        e.setStyle(fromMap(full.get("style"), BoardElement.Style.class));
        e.setShape(fromMap(full.get("shape"), BoardElement.ShapeData.class));
        e.setConnector(fromMap(full.get("connector"), BoardElement.ConnectorData.class));
        e.setFieldSeq(fieldSeq(full.get("fieldSeq")));
        e.setVersion(full.get("version") instanceof Number n ? n.longValue() : 0L);
        return e;
    }

    public static boolean same(Object a, Object b) {
        if (a == b) return true;
        if (a instanceof Number x && b instanceof Number y) return x.doubleValue() == y.doubleValue();
        if (a instanceof Map<?, ?> ma && b instanceof Map<?, ?> mb) {
            // Mongo không lưu field null của POJO nên key thiếu = null
            Set<Object> keys = new HashSet<>(ma.keySet());
            keys.addAll(mb.keySet());
            for (Object k : keys) {
                if (!same(ma.get(k), mb.get(k))) return false;
            }
            return true;
        }
        if (a instanceof List<?> la && b instanceof List<?> lb) {
            if (la.size() != lb.size()) return false;
            for (int i = 0; i < la.size(); i++) {
                if (!same(la.get(i), lb.get(i))) return false;
            }
            return true;
        }
        return Objects.equals(a, b);
    }

    private static Map<String, Object> toMap(Object pojo) {
        return pojo == null ? null : MAPPER.convertValue(pojo, MAP_TYPE);
    }

    private static <T> T fromMap(Object value, Class<T> type) {
        return value == null ? null : MAPPER.convertValue(value, type);
    }

    private static double num(Object value) {
        return value instanceof Number n ? n.doubleValue() : 0.0;
    }

    // Đọc từ Mongo có thể ra Integer, ép hết về Long
    private static Map<String, Long> fieldSeq(Object value) {
        Map<String, Long> out = new LinkedHashMap<>();
        if (value instanceof Map<?, ?> m) {
            m.forEach((k, s) -> {
                if (s instanceof Number n) out.put(String.valueOf(k), n.longValue());
            });
        }
        return out;
    }
}
