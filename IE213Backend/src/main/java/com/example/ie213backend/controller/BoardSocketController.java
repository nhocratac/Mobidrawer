package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.BoardDto.socket.JoinRequest;
import com.example.ie213backend.domain.dto.CanvasPathDto.CreateCanvasPath;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.mapper.CanvasPathMapper;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.CanvasPathService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

import java.util.Objects;

@Controller
@RequiredArgsConstructor
public class BoardSocketController {
    private final BoardService boardService;

    private final CanvasPathService canvasPathService;

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
        // Trả về thông báo cho tất cả client trong topic
        return "User " + userId + " has joined board " + boardId;
    }


    @MessageMapping("/draw")  // Nhận tin nhắn từ client gửi đến "/app/draw"
    @SendTo("/topic/draw")    // Gửi tin nhắn đến tất cả client đăng ký "/topic/draw"
    public String handleDrawEvent(String message) {
        System.out.println("Received: " + message);
        return message;  // Gửi lại tin nhắn tới các client khác
    }

    @MessageMapping("/board/draw/{boardId}")  // Nhận tin nhắn từ client gửi đến "/app/draw"
    @SendTo("/topic/draw/board/{boardId}")
    public CanvasPath  createCanvasPath(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload  CreateCanvasPath canvasPath
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        return (canvasPathService.CreateCanvas(CanvasPathMapper.INSTANCE.createCanvasPathToEntity(canvasPath),userDto.getId() ));
    }
}