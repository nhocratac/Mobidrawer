package com.example.ie213backend.service;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;

public interface BoardService {
    public Board getBoard(String id ) ;
    public Board createBoard(Board board);
    public CanvasPath addCanvasPath(String id, CanvasPath canvasPath);
    public Board addMemberToBoard(String id, String email, Board.ROLE role);
}
