package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;

import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

public final class ElementValidator {
    public static final Set<String> TYPES = Set.of("sticky", "image", "shape", "connector");
    public static final Set<String> KINDS = Set.of("rect", "ellipse", "triangle", "line", "arrow");
    public static final Set<String> ANCHORS = Set.of("auto", "top", "right", "bottom", "left");
    public static final int MAX_TEXT = 10_000;
    private static final Pattern OID = Pattern.compile("^[0-9a-f]{24}$");

    private ElementValidator() {
    }

    public static boolean isObjectId(String id) {
        return id != null && OID.matcher(id).matches();
    }

    public static void validate(BoardElement e) {
        if (e.getId() != null && !isObjectId(e.getId())) throw new IllegalArgumentException("invalid id");
        if (!TYPES.contains(e.getType())) throw new IllegalArgumentException("invalid type");
        validateText(e.getText());
        switch (e.getType()) {
            case "image" -> {
                if (e.getImage() == null || e.getImage().getUrl() == null || e.getImage().getUrl().isBlank())
                    throw new IllegalArgumentException("image.url required");
            }
            case "shape" -> validateShape(e.getShape());
            case "connector" -> validateConnector(e.getConnector());
            default -> {
            }
        }
    }

    public static void validateText(String text) {
        if (text != null && text.length() > MAX_TEXT) throw new IllegalArgumentException("text too long");
    }

    public static void validateShape(BoardElement.ShapeData shape) {
        if (shape == null || !KINDS.contains(shape.getKind())) throw new IllegalArgumentException("invalid shape.kind");
    }

    public static void validateConnector(BoardElement.ConnectorData c) {
        if (c == null || c.getFrom() == null || c.getTo() == null)
            throw new IllegalArgumentException("connector ends required");
        for (BoardElement.End end : List.of(c.getFrom(), c.getTo())) {
            if (end.getElementId() == null || end.getElementId().isBlank())
                throw new IllegalArgumentException("end.elementId required");
            if (!ANCHORS.contains(end.getAnchor())) throw new IllegalArgumentException("invalid anchor");
        }
        if (c.getFrom().getElementId().equals(c.getTo().getElementId()))
            throw new IllegalArgumentException("self connector");
    }
}
