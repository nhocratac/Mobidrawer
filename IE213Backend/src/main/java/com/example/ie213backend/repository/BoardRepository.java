package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Board;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface BoardRepository extends MongoRepository<Board, String> {

    Board findBy_id(String id);

}
