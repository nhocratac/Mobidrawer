package com.example.ie213backend.service;

import com.example.ie213backend.model.Board;
import com.example.ie213backend.repository.BoardRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


@Service
public class BoardService {
    @Autowired private BoardRepository boardRepository;

    public Board getBoard(String id ) {
        return boardRepository.findBy_id(id);
    }

    public Board createBoard(Board board) {
        return boardRepository.save(board);
    }

    public Board.CanvasPath addCanvasPath(String id,Board.CanvasPath canvasPath) {
        return boardRepository.addCanvasPath(id, canvasPath);
    }

}
