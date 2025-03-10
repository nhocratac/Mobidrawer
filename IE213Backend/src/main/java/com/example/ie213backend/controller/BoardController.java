package com.example.ie213backend.controller;


import com.example.ie213backend.domain.dto.BoardDto.CreateBoard;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.mapper.BoardMapper;
import com.example.ie213backend.service.BoardService;
import jakarta.validation.Valid;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/board")
public class BoardController {

    @Autowired
    private BoardService boardService;

    @GetMapping("/{id}")
    public ResponseEntity<Board> getBoardById(
            @PathVariable ObjectId id
    ) {
        return ResponseEntity.ok(boardService.getBoard(id));
    }

    @PostMapping("/create")
    public ResponseEntity<Board> createBoard(
            @RequestBody @Valid CreateBoard board
    ) {
        return ResponseEntity.ok(boardService.createBoard(BoardMapper.INSTANCE.createBoardToEntity(board)));
    }

    @PostMapping("/addPath/:{id}")
    ResponseEntity<CanvasPath> addPathToBoard(
            @PathVariable String id,
            @RequestBody CanvasPath canvasPath
    ) {
        return ResponseEntity.ok(boardService.addCanvasPath(id,canvasPath));
    }

}
