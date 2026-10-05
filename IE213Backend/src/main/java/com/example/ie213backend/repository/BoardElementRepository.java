package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardElement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BoardElementRepository extends MongoRepository<BoardElement, String> {
    List<BoardElement> findByBoardIdOrderByZAsc(String boardId);
}
