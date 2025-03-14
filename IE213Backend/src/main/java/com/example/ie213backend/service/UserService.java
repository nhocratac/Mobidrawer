package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.UserDto.CreateUserDto;
import com.example.ie213backend.domain.model.User;

import java.util.List;

public interface UserService {
    List<User> getAllUsers();
    User getUserByEmail(String email);
    User getUserById(String userId);
    User createUser(CreateUserDto user);
    void changePassword(User user);
    User getUserById(String userId);
}
