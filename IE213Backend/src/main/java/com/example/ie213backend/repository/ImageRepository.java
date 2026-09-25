package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Image;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ImageRepository extends MongoRepository<Image, String> {
    // Board-scoped delete: an image id from another board matches nothing.
    long deleteByIdAndBoardId(String id, String boardId);
}
