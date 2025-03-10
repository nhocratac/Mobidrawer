package com.example.ie213backend.service;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.repository.BoardRepository;
import org.bson.types.ObjectId;
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

    public Board getBoard(ObjectId id ) {
        return boardRepository.findByid(id);
    }

    public Board createBoard(Board board) {
        return boardRepository.save(board);
    }

    public CanvasPath addCanvasPath(String id, CanvasPath canvasPath) {
        Query query = new Query(Criteria.where("_id").is(id));
        Update update = new Update().push("canvasPath", canvasPath);
        mongoTemplate.updateFirst(query, update, Board.class);
        return canvasPath;
    }

}
