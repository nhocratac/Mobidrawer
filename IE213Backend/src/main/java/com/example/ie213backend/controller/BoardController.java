package com.example.ie213backend.controller;


import com.example.ie213backend.domain.dto.BoardDto.*;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.mapper.BoardMapper;
import com.example.ie213backend.security.BoardAccessService;
import com.example.ie213backend.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;


@RestController
@RequestMapping("${api.prefix}/board")
@RequiredArgsConstructor
public class BoardController {

    private final BoardService boardService;
    private final BoardAccessService boardAccessService;


    @GetMapping("/{id}")
    public ResponseEntity<BoardFullDetailResponse> getBoardById(
            @PathVariable String id,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(boardService.getBoard(id, userDto.getId()));
    }

    @PostMapping("/create")
    public ResponseEntity<Board> createBoard(
            @RequestBody @Valid CreateBoard board,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(boardService.createBoard(BoardMapper.INSTANCE.createBoardToEntity(board), userDto.getId()));
    }

    @PostMapping("/addPath/{id}")
    ResponseEntity<CanvasPath> addPathToBoard(
            @PathVariable String id,
            @RequestBody CanvasPath canvasPath,
            @RequestAttribute("user") UserDto userDto
    ) {
        boardAccessService.assertCanEdit(id, userDto.getId());
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

    @PutMapping("/thumbnail/{id}")
    ResponseEntity<Board> thumbnailBoard(
            @RequestAttribute("user") UserDto userDto,
            @RequestBody UpdateThumbnail updateThumbnail,
            @PathVariable String id
    ) {
        boardAccessService.assertCanWrite(id, userDto.getId());
        return ResponseEntity.ok(boardService.updateThumbnail(id,userDto.getId(),updateThumbnail.getThumbnail()));
    }

    @GetMapping("/getMembersDetail/{id}")
    ResponseEntity<List<MemberDetailDTO>> getMembersDetail(
            @PathVariable String id, // boardId
            @RequestAttribute("user") UserDto userDto
    ) {
        if (!boardAccessService.canAccess(id, userDto.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập board này");
        }
        return ResponseEntity.ok(boardService.getMembersDetail(id));
    }

}
