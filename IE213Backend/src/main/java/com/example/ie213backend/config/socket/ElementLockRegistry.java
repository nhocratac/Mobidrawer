package com.example.ie213backend.config.socket;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Lock đang sửa của element (không lưu DB): nhớ session nào giữ để gỡ khi session đó ngắt kết nối
@Component
public class ElementLockRegistry {
    public record Lock(String sessionId, String userId, String boardId, String elementId) {
    }

    private final Map<String, Lock> locks = new ConcurrentHashMap<>();

    private static String key(String boardId, String elementId) {
        return boardId + ":" + elementId;
    }

    // false nếu element đang bị user khác giữ
    public synchronized boolean lock(String sessionId, String userId, String boardId, String elementId) {
        Lock current = locks.get(key(boardId, elementId));
        if (current != null && !current.userId().equals(userId)) return false;
        locks.put(key(boardId, elementId), new Lock(sessionId, userId, boardId, elementId));
        return true;
    }

    // false nếu element đang bị user khác giữ; element không bị khoá thì coi như thành công
    public synchronized boolean unlock(String userId, String boardId, String elementId) {
        Lock current = locks.get(key(boardId, elementId));
        if (current == null) return true;
        if (!current.userId().equals(userId)) return false;
        locks.remove(key(boardId, elementId));
        return true;
    }

    public synchronized List<Lock> releaseSession(String sessionId) {
        List<Lock> released = new ArrayList<>();
        locks.values().removeIf(lock -> {
            if (!lock.sessionId().equals(sessionId)) return false;
            released.add(lock);
            return true;
        });
        return released;
    }

    public List<Lock> locksOf(String boardId) {
        return locks.values().stream().filter(l -> l.boardId().equals(boardId)).toList();
    }
}
