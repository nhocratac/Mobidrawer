package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SetOperations;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure-JVM unit tests for BUG 4 — presence-key TTL. A hand-rolled
 * RedisTemplate subclass (no Mockito, no connection factory) records
 * opsForSet().add and expire invocations so the test can assert
 * refresh-on-write fires on both write paths and never on the read path.
 */
class SecHardeningPresenceTtlTest {

    private static final String BOARD_ID = "board-42";
    private static final String EXPECTED_KEY = "board:" + BOARD_ID;

    private List<String> expireKeys;
    private List<Duration> expireDurations;
    private FakeRedisTemplate redisTemplate;
    private CacheUserInBoardServiceImpl service;

    @BeforeEach
    void setUp() {
        expireKeys = new ArrayList<>();
        expireDurations = new ArrayList<>();
        redisTemplate = new FakeRedisTemplate(expireKeys, expireDurations);
        service = new CacheUserInBoardServiceImpl(redisTemplate);
    }

    @Test
    void addUserToBoard_firesExpireWithConstantOnCorrectKey() {
        UserDto user = UserDto.builder().id("user-1").firstName("Alice").build();

        service.addUserToBoard(BOARD_ID, user);

        assertEquals(1, expireKeys.size());
        assertEquals(EXPECTED_KEY, expireKeys.get(0));
        assertTrue(expireDurations.get(0).toMinutes() >= 5 && expireDurations.get(0).toHours() <= 24,
                "TTL must be a bounded positive duration between 5 minutes and 24 hours");
    }

    @Test
    void removeUserFromBoard_firesExpireWithConstantOnCorrectKey() {
        UserDto user = UserDto.builder().id("user-1").firstName("Alice").build();
        service.addUserToBoard(BOARD_ID, user);
        expireKeys.clear();
        expireDurations.clear();

        service.removeUserFromBoard(BOARD_ID, "user-1");

        assertEquals(1, expireKeys.size());
        assertEquals(EXPECTED_KEY, expireKeys.get(0));
        assertTrue(expireDurations.get(0).toMinutes() >= 5 && expireDurations.get(0).toHours() <= 24);
    }

    @Test
    void getUsersInBoard_neverFiresExpire() {
        UserDto user = UserDto.builder().id("user-1").firstName("Alice").build();
        service.addUserToBoard(BOARD_ID, user);
        expireKeys.clear();
        expireDurations.clear();

        service.getUsersInBoard(BOARD_ID);

        assertTrue(expireKeys.isEmpty(), "read path must not call expire");
    }

    /**
     * Hand-rolled RedisTemplate subclass. Overrides only the members touched
     * by CacheUserInBoardServiceImpl (opsForSet(), expire(K, long, TimeUnit),
     * delete(K)) with an in-memory backing store, so no connection factory
     * is ever needed.
     */
    private static class FakeRedisTemplate extends RedisTemplate<String, UserDto> {
        private final java.util.Map<String, Set<UserDto>> store = new java.util.HashMap<>();
        private final List<String> expireKeys;
        private final List<Duration> expireDurations;

        FakeRedisTemplate(List<String> expireKeys, List<Duration> expireDurations) {
            this.expireKeys = expireKeys;
            this.expireDurations = expireDurations;
        }

        @Override
        @SuppressWarnings("unchecked")
        public SetOperations<String, UserDto> opsForSet() {
            InvocationHandler handler = (proxy, method, args) -> {
                switch (method.getName()) {
                    case "add": {
                        String key = (String) args[0];
                        Object[] values = (Object[]) args[1];
                        Set<UserDto> set = store.computeIfAbsent(key, k -> new HashSet<>());
                        long added = 0;
                        for (Object value : values) {
                            if (set.add((UserDto) value)) {
                                added++;
                            }
                        }
                        return added;
                    }
                    case "members": {
                        String key = (String) args[0];
                        return new HashSet<>(store.getOrDefault(key, new HashSet<>()));
                    }
                    default:
                        throw new UnsupportedOperationException("Unstubbed SetOperations method: " + method.getName());
                }
            };
            return (SetOperations<String, UserDto>) Proxy.newProxyInstance(
                    SetOperations.class.getClassLoader(), new Class<?>[]{SetOperations.class}, handler);
        }

        @Override
        public Boolean delete(String key) {
            return store.remove(key) != null;
        }

        @Override
        public Boolean expire(String key, long timeout, TimeUnit unit) {
            expireKeys.add(key);
            expireDurations.add(Duration.ofMillis(unit.toMillis(timeout)));
            return true;
        }
    }
}
