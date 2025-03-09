package com.example.ie213backend.controller;


import com.example.ie213backend.domain.dto.BoardDto.CreateBoard;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.service.BoardService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/board")
public class BoardController {

    @Autowired
    private BoardService boardService;

    @GetMapping("/{id}")
    public ResponseEntity<Board> getBoardById(
            @PathVariable String id
    ) {
        // get Token
        return ResponseEntity.ok(boardService.getBoard(id));
    }

    @PostMapping("/create")
    public ResponseEntity<Board> createBoard(
            @RequestBody @Valid CreateBoard board
    ) {

        Board.Option option = new Board.Option(
                board.getOption().isGrid(),
                board.getOption().getBackgroundColor()
        );
        List<CreateBoard.PermissionDTO> perrmisionRaw = board.getPermissionsDTO();
        List<Board.Permission> perrmisions = null;
        if(perrmisionRaw != null) {
            perrmisions = perrmisionRaw.stream().map(
                    item -> new Board.Permission(
                            item.getMemberId(),
                            item.getRole()
                    )
            ).toList();
        }
        LocalDateTime timeCreate = LocalDateTime.now();
        return ResponseEntity.ok(boardService.createBoard(new Board(
                board.getId(),
                board.getName(),
                timeCreate,
                board.getOwner(),
                board.getType(),
                board.getDescription(),
                option,
                perrmisions,
                null
        )));
    }

    @PostMapping("/addPath/:{id}")
    ResponseEntity<Board.CanvasPath> addPathToBoard(
            @PathVariable String id,
            @RequestBody Board.CanvasPath canvasPath
    ) {
        return ResponseEntity.ok(boardService.addCanvasPath(id,canvasPath));
    }

}
