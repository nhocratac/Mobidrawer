package com.example.ie213backend.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketController {

    @MessageMapping("/board/add-new-path/{id}")  // Nhận message từ client
    @SendTo("/topic/board/{id}")  // Gửi đến tất cả client đăng ký "/topic/messages"
    public String handleWebSocketMessage(String message) {
        System.out.println("Nhận từ client: " + message);
        return "Server phản hồi: " + message;
    }
}
