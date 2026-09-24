package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.UserDto.PresenceSnapshot;
import com.example.ie213backend.domain.dto.UserDto.PresenceUserDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.CacheUserInBoardService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Redis layout:
 * <ul>
 *   <li>{@code presence:board:{boardId}} HASH: field = STOMP sessionId, value = PresenceUserDto JSON</li>
 *   <li>{@code presence:session:{sessionId}} SET: boardIds joined by that session (reverse index)</li>
 *   <li>{@code presence:seq} STRING: global INCR counter, never expires</li>
 * </ul>
 * Each mutation is a single atomic Redis command. The seq is taken after the mutation
 * and before reading the hash, so the highest seq always reflects the latest state.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CacheUserInBoardServiceImpl implements CacheUserInBoardService {
    static final String BOARD_PREFIX = "presence:board:";
    static final String SESSION_PREFIX = "presence:session:";
    static final String SEQ_KEY = "presence:seq";
    static final Duration PRESENCE_TTL = Duration.ofHours(12);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public PresenceSnapshot join(String boardId, String sessionId, UserDto user) {
        String boardKey = BOARD_PREFIX + boardId;
        String sessionKey = SESSION_PREFIX + sessionId;
        redisTemplate.opsForHash().put(boardKey, sessionId, toJson(PresenceUserDto.from(user)));
        redisTemplate.expire(boardKey, PRESENCE_TTL);
        redisTemplate.opsForSet().add(sessionKey, boardId);
        redisTemplate.expire(sessionKey, PRESENCE_TTL);
        return snapshot(boardId);
    }

    @Override
    public PresenceSnapshot leave(String boardId, String sessionId) {
        redisTemplate.opsForHash().delete(BOARD_PREFIX + boardId, sessionId);
        redisTemplate.opsForSet().remove(SESSION_PREFIX + sessionId, boardId);
        return snapshot(boardId);
    }

    @Override
    public Map<String, PresenceSnapshot> removeSession(String sessionId) {
        String sessionKey = SESSION_PREFIX + sessionId;
        Set<String> boardIds = redisTemplate.opsForSet().members(sessionKey);
        redisTemplate.delete(sessionKey);
        Map<String, PresenceSnapshot> changed = new LinkedHashMap<>();
        if (boardIds == null) {
            return changed;
        }
        for (String boardId : boardIds) {
            Long removed = redisTemplate.opsForHash().delete(BOARD_PREFIX + boardId, sessionId);
            if (removed != null && removed > 0) {
                changed.put(boardId, snapshot(boardId));
            }
        }
        return changed;
    }

    @Override
    public PresenceSnapshot snapshot(String boardId) {
        Long seq = redisTemplate.opsForValue().increment(SEQ_KEY);
        List<Object> values = redisTemplate.opsForHash().values(BOARD_PREFIX + boardId);
        Map<String, PresenceUserDto> byId = new LinkedHashMap<>();
        if (values != null) {
            for (Object value : values) {
                PresenceUserDto user = fromJson(String.valueOf(value));
                if (user != null && user.id() != null) {
                    byId.putIfAbsent(user.id(), user);
                }
            }
        }
        return new PresenceSnapshot(seq == null ? 0L : seq, new ArrayList<>(byId.values()));
    }

    @Override
    public void clearAll() {
        List<String> keys = new ArrayList<>();
        for (String pattern : List.of(BOARD_PREFIX + "*", SESSION_PREFIX + "*")) {
            try (Cursor<String> cursor = redisTemplate.scan(ScanOptions.scanOptions().match(pattern).count(500).build())) {
                cursor.forEachRemaining(keys::add);
            }
        }
        if (!keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
        log.info("Presence: cleared {} stale presence keys on startup", keys.size());
    }

    private String toJson(PresenceUserDto user) {
        try {
            return objectMapper.writeValueAsString(user);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize presence user", e);
        }
    }

    private PresenceUserDto fromJson(String json) {
        try {
            return objectMapper.readValue(json, PresenceUserDto.class);
        } catch (JsonProcessingException e) {
            log.warn("Presence: skipping unreadable hash entry");
            return null;
        }
    }
}
