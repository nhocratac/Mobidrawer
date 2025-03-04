package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.UserDto.createUserDto;
import com.example.ie213backend.domain.model.User;

import java.util.List;

public interface UserService {
    List<User> getAllUsers();
    User getUserByEmail(String email);
    User createUser(createUserDto user);
    void changePassword(User user);
}
