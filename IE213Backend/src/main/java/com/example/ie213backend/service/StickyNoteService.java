package com.example.ie213backend.service;

import com.example.ie213backend.domain.model.StickyNote;

import java.util.List;


public interface StickyNoteService {
    StickyNote createStickyNote(StickyNote stickyNote);

    StickyNote updateStickyNotePosition(String id,String boardId,String owner, int x, int y);

    StickyNote updateStickyNoteSize(StickyNote stickyNote);

     StickyNote chaneTextStickyNote(StickyNote stickyNote);

     void deleteStickyNote(String id, String boardId, String owner);

    List<StickyNote> createStickyNotes(List<StickyNote> stickyNotes);
}
