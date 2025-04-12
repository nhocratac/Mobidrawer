package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.User;

import java.util.Set;

public interface CacheUserInBoardService {
    Set<UserDto> addUserToBoard(String boardId, UserDto user);
    Set<UserDto> getUsersInBoard(String boardId);
    void removeUserFromBoard(String boardId, String userId);
}
