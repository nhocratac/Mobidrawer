package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.CanvasPath;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CanvaPathRepository extends MongoRepository<CanvasPath, String> {
    // Board-scoped lookup/delete: a path id from another board matches nothing.
    Optional<CanvasPath> findByIdAndBoardId(String id, String boardId);

    long deleteByIdAndBoardId(String id, String boardId);
}
