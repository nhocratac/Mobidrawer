package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.StickyNote;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StickyNoteRepository extends MongoRepository<StickyNote, String> {
    // Board-scoped delete: a note id from another board matches nothing.
    long deleteByIdAndBoardId(String id, String boardId);
}
