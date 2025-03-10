package com.example.ie213backend.controller;


import com.example.ie213backend.domain.dto.BoardDto.CreateBoard;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.mapper.BoardMapper;
import com.example.ie213backend.service.BoardService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.ie213backend.domain.dto.BoardDto.AddMember;


@RestController
@RequestMapping("${api.prefix}/board")
public class BoardController {

    @Autowired
    private BoardService boardService;
    private RequestBody addMember;

    @GetMapping("/{id}")
    public ResponseEntity<Board> getBoardById(
            @PathVariable String id
    ) {
        return ResponseEntity.ok(boardService.getBoard(id));
    }

    @PostMapping("/create")
    public ResponseEntity<Board> createBoard(
            @RequestBody @Valid CreateBoard board
    ) {
        return ResponseEntity.ok(boardService.createBoard(BoardMapper.INSTANCE.createBoardToEntity(board)));
    }

    @PostMapping("/addPath/{id}")
    ResponseEntity<CanvasPath> addPathToBoard(
            @PathVariable String id,
            @RequestBody CanvasPath canvasPath
    ) {
        return ResponseEntity.ok(boardService.addCanvasPath(id,canvasPath));
    }

    @PostMapping("/addMember/{id}")
    Board addMemberToBoard(
            @PathVariable String id,
            @RequestBody AddMember addMember
    ) {
        return boardService.addMemberToBoard(id,addMember.getEmail(), Board.ROLE.valueOf(addMember.getRole()));
    }

}
