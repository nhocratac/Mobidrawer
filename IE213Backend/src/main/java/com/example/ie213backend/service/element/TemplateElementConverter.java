package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.Template;

import java.util.*;
import java.util.function.Supplier;

// Tạo element mới cho board từ template: cấp id mới và nối lại connector
public final class TemplateElementConverter {
    private TemplateElementConverter() {
    }

    public static List<BoardElement> fromTemplate(Template template, Supplier<String> newId) {
        if (template.getElements() != null && !template.getElements().isEmpty())
            return fromElements(template.getElements(), newId);
        return fromLegacy(template, newId);
    }

    private static List<BoardElement> fromElements(List<BoardElement> source, Supplier<String> newId) {
        Map<String, String> idMap = new HashMap<>();
        List<BoardElement> out = new ArrayList<>();
        for (BoardElement e : source) {
            if ("connector".equals(e.getType()) || !isValid(e)) continue;
            BoardElement copy = copy(e, newId.get());
            if (e.getId() != null) idMap.put(e.getId(), copy.getId());
            out.add(copy);
        }
        for (BoardElement e : source) {
            if (!"connector".equals(e.getType()) || e.getConnector() == null) continue;
            BoardElement.End from = e.getConnector().getFrom();
            BoardElement.End to = e.getConnector().getTo();
            if (from == null || to == null || !idMap.containsKey(from.getElementId()) || !idMap.containsKey(to.getElementId()))
                continue;
            BoardElement copy = copy(e, newId.get());
            copy.setConnector(new BoardElement.ConnectorData(
                    new BoardElement.End(idMap.get(from.getElementId()), from.getAnchor()),
                    new BoardElement.End(idMap.get(to.getElementId()), to.getAnchor())));
            out.add(copy);
        }
        return out;
    }

    private static List<BoardElement> fromLegacy(Template template, Supplier<String> newId) {
        List<BoardElement> out = new ArrayList<>();
        int z = 0;
        for (Template.StickyNote s : Optional.ofNullable(template.getStickyNotes()).orElse(List.of())) {
            BoardElement e = blank(newId.get(), "sticky", ++z);
            if (s.getPosition() != null) {
                e.setX(s.getPosition().getX());
                e.setY(s.getPosition().getY());
            }
            e.setW(s.getSize() != null ? s.getSize().getWidth() : LegacyElementMapper.DEFAULT_SIZE);
            e.setH(s.getSize() != null ? s.getSize().getHeight() : LegacyElementMapper.DEFAULT_SIZE);
            e.setText(s.getText());
            e.setStyle(new BoardElement.Style(s.getColor(), null, null, null));
            out.add(e);
        }
        for (Template.Image i : Optional.ofNullable(template.getImages()).orElse(List.of())) {
            BoardElement e = blank(newId.get(), "image", ++z);
            if (i.getPosition() != null) {
                e.setX(i.getPosition().getX());
                e.setY(i.getPosition().getY());
            }
            e.setW(i.getSize() != null ? i.getSize().getWidth() : LegacyElementMapper.DEFAULT_SIZE);
            e.setH(i.getSize() != null ? i.getSize().getHeight() : LegacyElementMapper.DEFAULT_SIZE);
            e.setImage(new BoardElement.ImageData(i.getUrl(), i.getCloudinaryId(), i.getAlt()));
            out.add(e);
        }
        return out;
    }

    // Template có thể chứa dữ liệu lỗi: bỏ element không hợp lệ thay vì làm hỏng cả board
    private static boolean isValid(BoardElement e) {
        try {
            BoardElement probe = copy(e, null);
            ElementValidator.validate(probe);
            return true;
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private static BoardElement blank(String id, String type, double z) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setType(type);
        e.setZ(z);
        return e;
    }

    private static BoardElement copy(BoardElement e, String id) {
        BoardElement c = new BoardElement();
        c.setId(id);
        c.setType(e.getType());
        c.setX(e.getX());
        c.setY(e.getY());
        c.setW(e.getW());
        c.setH(e.getH());
        c.setRotation(e.getRotation());
        c.setZ(e.getZ());
        c.setText(e.getText());
        c.setStyle(e.getStyle());
        c.setImage(e.getImage());
        c.setShape(e.getShape());
        return c;
    }
}
