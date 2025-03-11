package com.example.ie213backend.controller;


import com.example.ie213backend.domain.dto.BoardDto.AddMember;
import com.example.ie213backend.domain.dto.BoardDto.BoardDTO;
import com.example.ie213backend.domain.dto.BoardDto.ChangeRole;
import com.example.ie213backend.domain.dto.BoardDto.CreateBoard;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.mapper.BoardMapper;
import com.example.ie213backend.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("${api.prefix}/board")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;

    private RequestBody addMember;

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
            @RequestBody AddMember addMember,
            @RequestAttribute("user") UserDto userDto
    ) {
        return boardService.addMemberToBoard(id,addMember.getEmail(), Board.ROLE.valueOf(addMember.getRole()),userDto.getId());
    }

    @PostMapping("/change-role/{id}")
    Board changeRoleOfMember(
            @PathVariable String id, // boardId
            @RequestBody ChangeRole changeRole,
            @RequestAttribute("user") UserDto userDto
            ) {
        return boardService.changeRoleOfMember(id,changeRole.getMemberId(),Board.ROLE.valueOf(changeRole.getRole()),userDto.getId());
    }

    @GetMapping("/get-boards")
    ResponseEntity<List<BoardDTO>> getBoards(
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(boardService.findAllBoardofUser(userDto.getId()));
    }

}
