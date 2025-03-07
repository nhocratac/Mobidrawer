package com.example.ie213backend.service;

import com.example.ie213backend.model.Board;
import com.example.ie213backend.repository.BoardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;



@Service
public class BoardService {
    @Autowired private BoardRepository boardRepository;

    @Autowired private MongoTemplate mongoTemplate;

    public Board getBoard(String id ) {
        return boardRepository.findBy_id(id);
    }

    public Board createBoard(Board board) {
        return boardRepository.save(board);
    }

    public Board.CanvasPath addCanvasPath(String id,Board.CanvasPath canvasPath) {
        Query query = new Query(Criteria.where("_id").is(id));
        Update update = new Update().push("canvasPath", canvasPath);
        mongoTemplate.updateFirst(query, update, Board.class);
        return canvasPath;
    }

}
