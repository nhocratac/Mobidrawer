package com.example.ie213backend.controller;

import com.example.ie213backend.model.User;
import com.example.ie213backend.dto.UserDto.*;
import com.example.ie213backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;


    @GetMapping()
    public User getUserByUsername(String email) {
        return userService.getUserByEmail(email);
    }

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody @Valid createUserDto user) {
        User userCreated = userService.createUser(user);
        return new ResponseEntity<>(userCreated, HttpStatus.CREATED);
    }
}