package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;


@Service
public class BoardServiceImpl implements BoardService {
    @Autowired private BoardRepository boardRepository;

    @Autowired private UserRepository userRepository;

    @Autowired private MongoTemplate mongoTemplate;

    @Override
    public Board getBoard(String id ) {
        return boardRepository.findByid(id);
    }

    @Override
    public Board createBoard(Board board) {
        if (board.getMembers() == null) {
            board.setMembers(new ArrayList<>());
        }

        if (board.getCanvasPaths() == null) {
            board.setCanvasPaths(new ArrayList<>());
        }
        return boardRepository.save(board);
    }

    @Override
    public CanvasPath addCanvasPath(String id, CanvasPath canvasPath) {
        Query query = new Query(Criteria.where("_id").is(id));
        Update update = new Update().push("canvasPath", canvasPath);
        mongoTemplate.updateFirst(query, update, Board.class);
        return canvasPath;
    }

    @Override
    public Board addMemberToBoard(String id, String email, Board.ROLE role) {
        Optional<Board> optionalBoard = boardRepository.findById(id);
        if (optionalBoard.isEmpty()) {
            throw new RuntimeException("Board not found with id: " + id);
        }

        Optional<User> optionalUser = userRepository.findByEmail(email);
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("User not found with email: " + email);
        }

        User user = optionalUser.get();

        Board findBoard = optionalBoard.get();

        Board.Member newMember = new Board.Member(user.getId(),role);

        if(findBoard.getMembers().isEmpty() ) {
            findBoard.setMembers(new ArrayList<>());
        }
        findBoard.getMembers().add(newMember);


        return boardRepository.save(findBoard);
    }


}
