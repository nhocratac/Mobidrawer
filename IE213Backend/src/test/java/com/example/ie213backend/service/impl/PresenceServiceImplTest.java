package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.UserDto.PresenceSnapshot;
import com.example.ie213backend.domain.dto.UserDto.PresenceUserDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure-JVM unit tests for session-keyed board presence. A hand-rolled
 * StringRedisTemplate subclass (no Mockito, no connection factory) backs
 * opsForHash/opsForSet/opsForValue, expire, delete and scan with in-memory maps.
 */
class PresenceServiceImplTest {

    private static final String BOARD_A = "board-A";
    private static final String BOARD_B = "board-B";

    private FakeStringRedisTemplate redis;
    private CacheUserInBoardServiceImpl service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final UserDto alice = UserDto.builder().id("u-alice").firstName("Alice").lastName("A")
            .email("alice@example.com").phone("0900000001").avatarUrl("http://a/alice.png").build();
    private final UserDto bob = UserDto.builder().id("u-bob").firstName("Bob").lastName("B")
            .email("bob@example.com").phone("0900000002").build();

    @BeforeEach
    void setUp() {
        redis = new FakeStringRedisTemplate();
        service = new CacheUserInBoardServiceImpl(redis, objectMapper);
    }

    private static Set<String> ids(PresenceSnapshot snapshot) {
        Set<String> ids = new LinkedHashSet<>();
        snapshot.users().forEach(u -> ids.add(u.id()));
        return ids;
    }

    @Test
    void twoSessionsOfSameUser_countOnce_andUserStaysOnlineUntilBothLeave() {
        service.join(BOARD_A, "s1", alice);
        PresenceSnapshot afterSecondTab = service.join(BOARD_A, "s2", alice);
        assertEquals(1, afterSecondTab.users().size(), "same user in two tabs must be deduplicated by id");

        PresenceSnapshot afterFirstLeave = service.leave(BOARD_A, "s1");
        assertEquals(Set.of("u-alice"), ids(afterFirstLeave), "other tab keeps the user online");

        PresenceSnapshot afterSecondLeave = service.leave(BOARD_A, "s2");
        assertTrue(afterSecondLeave.users().isEmpty());
    }

    @Test
    void join_writesSessionHashEntryReverseIndexAndBoundedTtl() {
        service.join(BOARD_A, "s1", alice);

        assertTrue(redis.hashes.get("presence:board:" + BOARD_A).containsKey("s1"));
        assertEquals(Set.of(BOARD_A), redis.sets.get("presence:session:s1"));
        assertTrue(redis.expireKeys.contains("presence:board:" + BOARD_A));
        assertTrue(redis.expireKeys.contains("presence:session:s1"));
        for (Duration d : redis.expireDurations) {
            assertTrue(d.toMinutes() >= 5 && d.toHours() <= 24, "TTL must be a bounded safety net");
        }
    }

    @Test
    void leave_neverDeletesTheBoardKey() {
        service.join(BOARD_A, "s1", alice);
        service.join(BOARD_A, "s2", bob);

        service.leave(BOARD_A, "s1");

        assertFalse(redis.deletedKeys.contains("presence:board:" + BOARD_A));
        assertEquals(Set.of("u-bob"), ids(service.snapshot(BOARD_A)));
    }

    @Test
    void removeSession_removesFromEveryJoinedBoard_andReturnsOnlyChangedBoards() {
        service.join(BOARD_A, "s1", alice);
        service.join(BOARD_B, "s1", alice);
        service.join(BOARD_B, "s2", bob);
        // Stale reverse-index entry: session index says board-C but the hash has no s1 entry.
        redis.sets.get("presence:session:s1").add("board-C");

        Map<String, PresenceSnapshot> changed = service.removeSession("s1");

        assertEquals(Set.of(BOARD_A, BOARD_B), changed.keySet(), "board-C did not change and must be skipped");
        assertTrue(changed.get(BOARD_A).users().isEmpty());
        assertEquals(Set.of("u-bob"), ids(changed.get(BOARD_B)));
        assertFalse(redis.sets.containsKey("presence:session:s1"), "reverse index is deleted");

        assertTrue(service.removeSession("s1").isEmpty(), "second call is a no-op");
    }

    @Test
    void seq_strictlyIncreasesAcrossBoardsAndOperations() {
        long s1 = service.join(BOARD_A, "s1", alice).seq();
        long s2 = service.join(BOARD_B, "s2", bob).seq();
        long s3 = service.leave(BOARD_A, "s1").seq();
        long s4 = service.removeSession("s2").get(BOARD_B).seq();

        assertTrue(s1 < s2 && s2 < s3 && s3 < s4, "seq must be global and monotonic: " + List.of(s1, s2, s3, s4));
    }

    @Test
    void snapshotJson_containsOnlySlimFields_noEmailOrPhone() throws Exception {
        PresenceSnapshot snapshot = service.join(BOARD_A, "s1", alice);

        String json = objectMapper.writeValueAsString(snapshot);
        assertFalse(json.contains("email"));
        assertFalse(json.contains("phone"));
        assertFalse(json.contains("alice@example.com"));
        assertFalse(redis.hashes.get("presence:board:" + BOARD_A).get("s1").contains("alice@example.com"),
                "stored hash value must be slim too");

        PresenceUserDto u = snapshot.users().get(0);
        assertEquals("u-alice", u.id());
        assertEquals("Alice", u.firstName());
        assertEquals("A", u.lastName());
        assertEquals("http://a/alice.png", u.avatarUrl());
        assertEquals(alice.getColor(), u.color());
        assertTrue(json.contains("\"seq\"") && json.contains("\"users\""));
    }

    @Test
    void clearAll_removesBoardAndSessionKeys_butKeepsSeq() {
        service.join(BOARD_A, "s1", alice);
        service.join(BOARD_B, "s2", bob);
        redis.strings.put("unrelated:key", "1");
        long seqBefore = Long.parseLong(redis.strings.get("presence:seq"));

        service.clearAll();

        assertTrue(redis.hashes.isEmpty());
        assertTrue(redis.sets.isEmpty());
        assertEquals(String.valueOf(seqBefore), redis.strings.get("presence:seq"));
        assertEquals("1", redis.strings.get("unrelated:key"));
        assertTrue(service.snapshot(BOARD_A).seq() > seqBefore, "seq keeps counting after a wipe");
    }

    /**
     * In-memory StringRedisTemplate. Overrides only what CacheUserInBoardServiceImpl
     * touches; any other operation throws so an unexpected call is visible.
     */
    private static class FakeStringRedisTemplate extends StringRedisTemplate {
        final Map<String, Map<String, String>> hashes = new HashMap<>();
        final Map<String, Set<String>> sets = new HashMap<>();
        final Map<String, String> strings = new HashMap<>();
        final List<String> expireKeys = new ArrayList<>();
        final List<Duration> expireDurations = new ArrayList<>();
        final List<String> deletedKeys = new ArrayList<>();

        @SuppressWarnings("unchecked")
        private static <T> T proxy(Class<T> type, InvocationHandler handler) {
            return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[]{type}, handler);
        }

        @Override
        @SuppressWarnings("unchecked")
        public <HK, HV> HashOperations<String, HK, HV> opsForHash() {
            return proxy(HashOperations.class, (p, m, args) -> {
                String key = (String) args[0];
                switch (m.getName()) {
                    case "put":
                        hashes.computeIfAbsent(key, k -> new LinkedHashMap<>()).put((String) args[1], (String) args[2]);
                        return null;
                    case "delete": {
                        Map<String, String> h = hashes.get(key);
                        long removed = 0;
                        for (Object field : (Object[]) args[1]) {
                            if (h != null && h.remove(field) != null) removed++;
                        }
                        if (h != null && h.isEmpty()) hashes.remove(key);
                        return removed;
                    }
                    case "values":
                        return new ArrayList<Object>(hashes.getOrDefault(key, Map.of()).values());
                    default:
                        throw new UnsupportedOperationException("Unstubbed HashOperations." + m.getName());
                }
            });
        }

        @Override
        @SuppressWarnings("unchecked")
        public SetOperations<String, String> opsForSet() {
            return proxy(SetOperations.class, (p, m, args) -> {
                String key = (String) args[0];
                switch (m.getName()) {
                    case "add": {
                        Set<String> s = sets.computeIfAbsent(key, k -> new LinkedHashSet<>());
                        long added = 0;
                        for (Object v : (Object[]) args[1]) if (s.add((String) v)) added++;
                        return added;
                    }
                    case "remove": {
                        Set<String> s = sets.get(key);
                        long removed = 0;
                        for (Object v : (Object[]) args[1]) if (s != null && s.remove(v)) removed++;
                        if (s != null && s.isEmpty()) sets.remove(key);
                        return removed;
                    }
                    case "members":
                        return sets.containsKey(key) ? new LinkedHashSet<>(sets.get(key)) : new LinkedHashSet<String>();
                    default:
                        throw new UnsupportedOperationException("Unstubbed SetOperations." + m.getName());
                }
            });
        }

        @Override
        @SuppressWarnings("unchecked")
        public ValueOperations<String, String> opsForValue() {
            return proxy(ValueOperations.class, (p, m, args) -> {
                if (m.getName().equals("increment") && args.length == 1) {
                    long next = Long.parseLong(strings.getOrDefault((String) args[0], "0")) + 1;
                    strings.put((String) args[0], String.valueOf(next));
                    return next;
                }
                throw new UnsupportedOperationException("Unstubbed ValueOperations." + m.getName());
            });
        }

        @Override
        public Boolean expire(String key, long timeout, TimeUnit unit) {
            expireKeys.add(key);
            expireDurations.add(Duration.ofMillis(unit.toMillis(timeout)));
            return true;
        }

        @Override
        public Boolean expire(String key, Duration timeout) {
            return expire(key, timeout.toMillis(), TimeUnit.MILLISECONDS);
        }

        @Override
        public Boolean delete(String key) {
            deletedKeys.add(key);
            boolean existed = hashes.remove(key) != null;
            existed |= sets.remove(key) != null;
            existed |= strings.remove(key) != null;
            return existed;
        }

        @Override
        public Long delete(Collection<String> keys) {
            long n = 0;
            for (String k : keys) if (delete(k)) n++;
            return n;
        }

        @Override
        @SuppressWarnings("unchecked")
        public Cursor<String> scan(ScanOptions options) {
            Pattern regex = Pattern.compile(options.getPattern().replace("*", ".*"));
            List<String> matched = new ArrayList<>();
            for (Set<String> keys : List.of(hashes.keySet(), sets.keySet(), strings.keySet())) {
                keys.stream().filter(k -> regex.matcher(k).matches()).forEach(matched::add);
            }
            Iterator<String> it = matched.iterator();
            return proxy(Cursor.class, (p, m, args) -> switch (m.getName()) {
                case "hasNext" -> it.hasNext();
                case "next" -> it.next();
                case "forEachRemaining" -> {
                    it.forEachRemaining((java.util.function.Consumer<? super String>) args[0]);
                    yield null;
                }
                case "close" -> null;
                case "isClosed" -> false;
                default -> throw new UnsupportedOperationException("Unstubbed Cursor." + m.getName());
            });
        }
    }
}
