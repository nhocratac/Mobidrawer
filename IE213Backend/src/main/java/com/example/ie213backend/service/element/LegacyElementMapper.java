package com.example.ie213backend.service.element;

import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.Image;
import com.example.ie213backend.domain.model.StickyNote;

// Chuyển sticky note / image của collection cũ sang BoardElement (giữ nguyên _id)
public final class LegacyElementMapper {
    public static final double DEFAULT_SIZE = 200;

    private LegacyElementMapper() {
    }

    public static BoardElement fromSticky(StickyNote s, double z) {
        BoardElement e = base(s.getId(), "sticky", s.getBoardId(), s.getOwner(), z, "stickyNote");
        if (s.getPosition() != null) {
            e.setX(s.getPosition().getX());
            e.setY(s.getPosition().getY());
        }
        e.setW(s.getSize() != null ? s.getSize().getWidth() : DEFAULT_SIZE);
        e.setH(s.getSize() != null ? s.getSize().getHeight() : DEFAULT_SIZE);
        e.setText(s.getText());
        e.setStyle(new BoardElement.Style(s.getColor(), null, null, null));
        e.setUpdateAt(s.getUpdateAt());
        return e;
    }

    public static BoardElement fromImage(Image i, double z) {
        BoardElement e = base(i.getId(), "image", i.getBoardId(), i.getOwner(), z, "Images");
        if (i.getPosition() != null) {
            e.setX(i.getPosition().getX());
            e.setY(i.getPosition().getY());
        }
        e.setW(i.getSize() != null ? i.getSize().getWidth() : DEFAULT_SIZE);
        e.setH(i.getSize() != null ? i.getSize().getHeight() : DEFAULT_SIZE);
        e.setImage(new BoardElement.ImageData(i.getUrl(), i.getCloudinaryId(), i.getAlt()));
        e.setUpdateAt(i.getUpdateAt());
        return e;
    }

    private static BoardElement base(String id, String type, String boardId, String owner, double z, String from) {
        BoardElement e = new BoardElement();
        e.setId(id);
        e.setType(type);
        e.setBoardId(boardId);
        e.setOwner(owner);
        e.setZ(z);
        e.setRotation(0);
        e.setVersion(0L);
        e.setMigratedFrom(from);
        return e;
    }
}
