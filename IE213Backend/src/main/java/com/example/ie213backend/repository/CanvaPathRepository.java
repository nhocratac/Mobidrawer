package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.CanvasPath;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CanvaPathRepository extends MongoRepository<CanvasPath, ObjectId> {
}
