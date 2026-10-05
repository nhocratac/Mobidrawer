package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ElementValidatorTest {
    private BoardElement base(String type) {
        BoardElement e = new BoardElement();
        e.setId("650000000000000000000001");
        e.setType(type);
        e.setW(100);
        e.setH(80);
        return e;
    }

    @Test
    void acceptsSticky() {
        assertDoesNotThrow(() -> ElementValidator.validate(base("sticky")));
    }

    @Test
    void rejectsUnknownType() {
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(base("stroke")));
    }

    @Test
    void imageNeedsUrl() {
        BoardElement e = base("image");
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
        e.setImage(new BoardElement.ImageData("https://res.cloudinary.com/x.png", "cid", "alt"));
        assertDoesNotThrow(() -> ElementValidator.validate(e));
    }

    @Test
    void shapeNeedsKnownKind() {
        BoardElement e = base("shape");
        e.setShape(new BoardElement.ShapeData("star"));
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
        e.setShape(new BoardElement.ShapeData("ellipse"));
        assertDoesNotThrow(() -> ElementValidator.validate(e));
    }

    @Test
    void connectorNeedsTwoDistinctEnds() {
        BoardElement e = base("connector");
        e.setConnector(new BoardElement.ConnectorData(
                new BoardElement.End("a", "auto"), new BoardElement.End("a", "auto")));
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
        e.setConnector(new BoardElement.ConnectorData(
                new BoardElement.End("a", "auto"), new BoardElement.End("b", "left")));
        assertDoesNotThrow(() -> ElementValidator.validate(e));
    }

    @Test
    void rejectsBadAnchor() {
        BoardElement e = base("connector");
        e.setConnector(new BoardElement.ConnectorData(
                new BoardElement.End("a", "middle"), new BoardElement.End("b", "auto")));
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
    }

    @Test
    void rejectsLongText() {
        BoardElement s = base("sticky");
        s.setText("x".repeat(10_001));
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(s));
    }

    @Test
    void rejectsNonHexId() {
        BoardElement e = base("sticky");
        e.setId("not-an-id");
        assertThrows(IllegalArgumentException.class, () -> ElementValidator.validate(e));
    }
}
