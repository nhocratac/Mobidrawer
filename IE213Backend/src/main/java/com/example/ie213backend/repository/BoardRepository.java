package com.example.ie213backend.repository;

import com.example.ie213backend.model.Board;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.mongodb.repository.Update;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface BoardRepository extends MongoRepository<Board, String> {

    Board findBy_id(String id);

    @Transactional
    @Update("{'$push': {'canvasPaths':?1}}")
    @Query("{ '_id': ?0 }")
    Board.CanvasPath addCanvasPath(String boardId, Board.CanvasPath canvasPath);

}
