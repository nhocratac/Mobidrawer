package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.CacheUserInBoardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CacheUserInBoardServiceImpl implements CacheUserInBoardService {
    private final RedisTemplate<String, UserDto> redisTemplate;
    private static final String BOARD_PREFIX = "board:";

    @Override
    public Set<UserDto> addUserToBoard(String boardId, UserDto user) {
        String key = BOARD_PREFIX + boardId;
        redisTemplate.opsForSet().add(key, user);
        return Objects.requireNonNull(redisTemplate.opsForSet().members(key))
                .stream().map(obj -> (UserDto) obj)
                .collect(Collectors.toSet());
    }

    @Override
    public Set<UserDto> getUsersInBoard(String boardId) {
        String key = BOARD_PREFIX + boardId;
        return Objects.requireNonNull(redisTemplate.opsForSet().members(key))
                .stream().map(obj -> (UserDto) obj)
                .collect(Collectors.toSet());
    }

    @Override
    public void removeUserFromBoard(String boardId, String userId) {
        String key = BOARD_PREFIX + boardId;
        Set<UserDto> users = getUsersInBoard(boardId);
        users.removeIf(user -> user.getId().equals(userId));

        // Xóa key cũ trong Redis
        redisTemplate.delete(key);

        // Cập nhật lại danh sách user còn lại
        users.forEach(user -> redisTemplate.opsForSet().add(key, user));
    }
}

