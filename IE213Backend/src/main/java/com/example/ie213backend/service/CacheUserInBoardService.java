package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.UserDto.UserDto;

import java.util.Set;

public interface CacheUserInBoardService {
    void addUserToBoard(String boardId, UserDto user);
    Set<UserDto> getUsersInBoard(String boardId);
    void removeUserFromBoard(String boardId, String userId);
}
