package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.UserDto.CreateUserDto;
import com.example.ie213backend.domain.dto.UserDto.UploadAvatar;
import com.example.ie213backend.domain.model.User;

import java.util.List;

public interface UserService {
    List<User> getAllUsers();
    User getUserByEmail(String email);
    User findUserById(String userId);
    User createUser(CreateUserDto user);
    void changePassword(User user);
    User getUserById(String userId);
    User getBaseInFormation(String userId);
    User uploadAvatar(UploadAvatar uploadAvatar);
    User saveUser(User user);
}
