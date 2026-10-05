package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.Image;
import com.example.ie213backend.domain.model.StickyNote;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LegacyElementMapperTest {
    @Test
    void mapsSticky() {
        StickyNote s = new StickyNote("650000000000000000000001", "hello", new StickyNote.Size(200, 150),
                new StickyNote.Position(10, 20), "bg-yellow-200", "650000000000000000000002", "650000000000000000000003", null);
        BoardElement e = LegacyElementMapper.fromSticky(s, 3);
        assertEquals("650000000000000000000001", e.getId());
        assertEquals("sticky", e.getType());
        assertEquals(10, e.getX());
        assertEquals(20, e.getY());
        assertEquals(200, e.getW());
        assertEquals(150, e.getH());
        assertEquals("hello", e.getText());
        assertEquals("bg-yellow-200", e.getStyle().getFill());
        assertEquals("650000000000000000000003", e.getBoardId());
        assertEquals("650000000000000000000002", e.getOwner());
        assertEquals(0, e.getRotation());
        assertEquals(3, e.getZ());
        assertEquals(0L, e.getVersion());
        assertEquals("stickyNote", e.getMigratedFrom());
    }

    @Test
    void mapsImageAndToleratesNullSize() {
        Image i = new Image();
        i.setId("650000000000000000000004");
        i.setUrl("https://res.cloudinary.com/a.png");
        i.setAlt("a");
        i.setCloudinaryId("cid");
        i.setPosition(new Image.Position(5, 6));
        i.setBoardId("650000000000000000000003");
        BoardElement e = LegacyElementMapper.fromImage(i, 7);
        assertEquals("image", e.getType());
        assertEquals("https://res.cloudinary.com/a.png", e.getImage().getUrl());
        assertEquals(5, e.getX());
        assertEquals(200, e.getW());
        assertEquals(200, e.getH());
        assertEquals("Images", e.getMigratedFrom());
    }

    @Test
    void stickyWithNullPositionDefaultsToOrigin() {
        StickyNote s = new StickyNote();
        s.setId("650000000000000000000005");
        BoardElement e = LegacyElementMapper.fromSticky(s, 0);
        assertEquals(0, e.getX());
        assertEquals(200, e.getW());
    }
}
