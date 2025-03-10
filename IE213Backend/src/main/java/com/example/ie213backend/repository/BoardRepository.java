package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Board;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;


@Repository
public interface BoardRepository extends MongoRepository<Board, ObjectId> {

    Board findByid(String id);

    Optional<Board> findById(String id);
}
