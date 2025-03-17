package com.example.ie213backend.controller;


import com.example.ie213backend.domain.dto.BoardDto.AddMember;
import com.example.ie213backend.domain.dto.BoardDto.BoardDTO;
import com.example.ie213backend.domain.dto.BoardDto.ChangeRole;
import com.example.ie213backend.domain.dto.BoardDto.CreateBoard;
import com.example.ie213backend.domain.dto.BoardDto.socket.JoinRequest;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.mapper.BoardMapper;
import com.example.ie213backend.service.BoardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
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
            @PathVariable String id,
            @RequestAttribute("user") UserDto userDto
    ) {
        return ResponseEntity.ok(boardService.getBoard(id, userDto.getId()));
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

    @MessageMapping("/board/add-new-path/{id}")  // Nhận message từ client
    @SendTo("/topic/board/{id}")  // Gửi đến tất cả client đăng ký "/topic/messages"
    public ResponseEntity<CanvasPath> handleWebSocketMessage(
            @Payload @Valid CanvasPath canvasPath,
            @DestinationVariable String id
    ) {
        return ResponseEntity.ok(boardService.addCanvasPath(id, canvasPath));
    }

    @MessageMapping("/board/join/{boardId}")
    @SendTo("/topic/board/{boardId}")
    public String handleUserJoin(
            @Payload JoinRequest joinRequest,
            @DestinationVariable String boardId
    ) {
        String userId = joinRequest.getUserId();
        System.out.println("User " + userId + " joined board " + boardId);

        // Trả về thông báo cho tất cả client trong topic
        return "User " + userId + " has joined board " + boardId;
    }


    @MessageMapping("/draw")  // Nhận tin nhắn từ client gửi đến "/app/draw"
    @SendTo("/topic/draw")    // Gửi tin nhắn đến tất cả client đăng ký "/topic/draw"
    public String handleDrawEvent(String message) {
        System.out.println("Received: " + message);
        return message;  // Gửi lại tin nhắn tới các client khác
    }

}
