package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.StickyNote;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;

public interface StickyNoteRepository extends MongoRepository<StickyNote, String> {
    // update vi tri cua StickyNote
    @Query(value = "{ '_id': ?0 }")
    @Update("{ '$set': { 'position.x': ?1, 'position.y': ?2 } }")
    void  updateStickyNotePosition(String id, int x, int y);
}
