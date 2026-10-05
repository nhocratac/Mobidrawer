package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.Template;
import org.junit.jupiter.api.Test;

import java.util.Iterator;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TemplateElementConverterTest {
    private BoardElement el(String id, String type) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setType(type);
        e.setW(100);
        e.setH(100);
        if ("shape".equals(type)) e.setShape(new BoardElement.ShapeData("rect"));
        return e;
    }

    @Test
    void remapsConnectorIds() {
        Template t = new Template();
        BoardElement a = el("aaaaaaaaaaaaaaaaaaaaaaaa", "shape");
        BoardElement b = el("bbbbbbbbbbbbbbbbbbbbbbbb", "sticky");
        BoardElement c = el("cccccccccccccccccccccccc", "connector");
        c.setConnector(new BoardElement.ConnectorData(new BoardElement.End(a.getId(), "auto"), new BoardElement.End(b.getId(), "left")));
        t.setElements(List.of(a, b, c));
        Iterator<String> ids = List.of("111111111111111111111111", "222222222222222222222222", "333333333333333333333333").iterator();
        List<BoardElement> out = TemplateElementConverter.fromTemplate(t, ids::next);
        assertEquals(3, out.size());
        assertEquals("111111111111111111111111", out.get(0).getId());
        assertEquals("111111111111111111111111", out.get(2).getConnector().getFrom().getElementId());
        assertEquals("222222222222222222222222", out.get(2).getConnector().getTo().getElementId());
        assertEquals("left", out.get(2).getConnector().getTo().getAnchor());
        assertEquals("aaaaaaaaaaaaaaaaaaaaaaaa", a.getId(), "input must not be mutated");
    }

    @Test
    void dropsDanglingConnector() {
        Template t = new Template();
        BoardElement c = el("cccccccccccccccccccccccc", "connector");
        c.setConnector(new BoardElement.ConnectorData(new BoardElement.End("x", "auto"), new BoardElement.End("y", "auto")));
        t.setElements(List.of(c));
        assertTrue(TemplateElementConverter.fromTemplate(t, () -> "111111111111111111111111").isEmpty());
    }

    @Test
    void legacyListsNullSafe() {
        Template t = new Template();
        t.setStickyNotes(List.of(new Template.StickyNote("hi", new Template.StickyNote.Position(1, 2),
                new Template.StickyNote.Size(200, 150), "bg-red-500")));
        List<BoardElement> out = TemplateElementConverter.fromTemplate(t, () -> "111111111111111111111111");
        assertEquals(1, out.size());
        assertEquals("sticky", out.get(0).getType());
        assertEquals(150, out.get(0).getH());
        assertEquals("bg-red-500", out.get(0).getStyle().getFill());
    }

    @Test
    void legacyImages() {
        Template t = new Template();
        t.setImages(List.of(new Template.Image("alt", new Template.Image.Position(3, 4),
                new Template.Image.Size(120, 80), "https://res.cloudinary.com/a.png", "cid")));
        List<BoardElement> out = TemplateElementConverter.fromTemplate(t, () -> "111111111111111111111111");
        assertEquals("image", out.get(0).getType());
        assertEquals("https://res.cloudinary.com/a.png", out.get(0).getImage().getUrl());
    }

    @Test
    void emptyTemplateGivesNothing() {
        assertTrue(TemplateElementConverter.fromTemplate(new Template(), () -> "111111111111111111111111").isEmpty());
    }

    @Test
    void skipsInvalidElements() {
        Template t = new Template();
        BoardElement bad = el("aaaaaaaaaaaaaaaaaaaaaaaa", "stroke");
        BoardElement badShape = el("bbbbbbbbbbbbbbbbbbbbbbbb", "shape");
        badShape.setShape(new BoardElement.ShapeData("star"));
        BoardElement ok = el("cccccccccccccccccccccccc", "sticky");
        t.setElements(List.of(bad, badShape, ok));
        List<BoardElement> out = TemplateElementConverter.fromTemplate(t, () -> "111111111111111111111111");
        assertEquals(1, out.size());
        assertEquals("sticky", out.get(0).getType());
    }
}
