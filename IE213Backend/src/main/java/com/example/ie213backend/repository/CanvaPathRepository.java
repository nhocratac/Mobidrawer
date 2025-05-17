package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.CanvasPath;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface CanvaPathRepository extends MongoRepository<CanvasPath, String> {
}
