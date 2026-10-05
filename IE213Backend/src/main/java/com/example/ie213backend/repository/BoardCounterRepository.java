package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardCounter;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BoardCounterRepository extends MongoRepository<BoardCounter, String> {
}
