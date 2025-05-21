package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.UserDto.UploadAvatar;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(path = "${api.prefix}/users")
@Slf4j
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

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userMapper.toDto(userService.getUserById(id)));
    }

    @PostMapping("/uploadAvatar")
    public ResponseEntity<UserDto> uploadAvatar(
            @RequestBody @Valid UploadAvatar uploadAvatar ,
            @RequestAttribute("user") UserDto userDto
    ) {
        uploadAvatar.setId(userDto.getId());
        return ResponseEntity.ok(userMapper.toDto(userService.uploadAvatar(uploadAvatar)));
    }

}
