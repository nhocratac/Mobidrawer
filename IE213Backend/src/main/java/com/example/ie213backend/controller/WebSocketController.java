package com.example.ie213backend.controller;

import com.example.ie213backend.model.Board;
import com.example.ie213backend.service.BoardService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class WebSocketController {

    @Autowired private
    BoardService boardService;

    @MessageMapping("/board/add-new-path/{id}")  // Nhận message từ client
    @SendTo("/topic/board/{id}")  // Gửi đến tất cả client đăng ký "/topic/messages"
    public ResponseEntity<Board.CanvasPath> handleWebSocketMessage(
            @Payload @Valid Board.CanvasPath canvasPath,
            @PathVariable String id
    ) {
         return ResponseEntity.ok(boardService.addCanvasPath(id,canvasPath));
    }



    @MessageMapping("/draw")  // Nhận tin nhắn từ client gửi đến "/app/draw"
    @SendTo("/topic/draw")    // Gửi tin nhắn đến tất cả client đăng ký "/topic/draw"
    public String handleDrawEvent(String message) {
        System.out.println("Received: " + message);
        return message;  // Gửi lại tin nhắn tới các client khác
    }
}
