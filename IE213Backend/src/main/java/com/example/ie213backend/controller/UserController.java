package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(path = "${api.prefix}/users")
public class UserController {
    private final UserService userService;
    private final UserMapper userMapper;

    @GetMapping
    public ResponseEntity<List<UserDto>> listUsers() {
        List<UserDto> users = userService.getAllUsers()
                .stream().map(userMapper::toDto)
                .toList();
        return ResponseEntity.ok(users);
    }


}
