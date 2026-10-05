package com.example.ie213backend.service.history;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

// Khóa ghi theo board trong JVM (chỉ đúng khi chạy một instance)
@Component
public class BoardLocks {
    private static final long TIMEOUT_SECONDS = 2;

    private final ConcurrentHashMap<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    public <T> T withLock(String boardId, Supplier<T> fn) {
        ReentrantLock lock = locks.computeIfAbsent(boardId, k -> new ReentrantLock());
        boolean acquired;
        try {
            acquired = lock.tryLock(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            acquired = false;
        }
        if (!acquired) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "board busy");
        try {
            return fn.get();
        } finally {
            lock.unlock();
        }
    }

    public boolean isHeldByCurrentThread(String boardId) {
        ReentrantLock lock = locks.get(boardId);
        return lock != null && lock.isHeldByCurrentThread();
    }
}
