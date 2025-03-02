package com.example.ie213backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TestController {

    @GetMapping("/public")
    public String publicEndpoint() {
        return "Đây là API công khai.";
    }

    @GetMapping("/user")
    public String userEndpoint() {
        return "Chào mừng người dùng!";
    }

    @GetMapping("/admin")
    public String adminEndpoint() {
        return "Chào mừng ADMIN!";
    }
}
