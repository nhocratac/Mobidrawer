package com.example.ie213backend.service.history;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

class BoardLocksTest {
    BoardLocks locks = new BoardLocks();

    @Test
    void reentrantOnSameThread() {
        assertFalse(locks.isHeldByCurrentThread("b"));
        boolean inner = locks.withLock("b", () -> locks.withLock("b", () -> locks.isHeldByCurrentThread("b")));
        assertTrue(inner, "lồng withLock cùng thread không được tự chặn");
        assertFalse(locks.isHeldByCurrentThread("b"), "unlock đủ số lần sau khi thoát");
    }

    @Test
    void releasesLockWhenFnThrows() {
        assertThrows(IllegalStateException.class, () -> locks.withLock("b", () -> {
            throw new IllegalStateException("boom");
        }));
        assertFalse(locks.isHeldByCurrentThread("b"));
        assertEquals(1, locks.withLock("b", () -> 1));
    }

    @Test
    void otherThreadHoldingLockGives503AfterTimeout() throws Exception {
        CountDownLatch held = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        Thread holder = new Thread(() -> locks.withLock("b", () -> {
            held.countDown();
            try {
                release.await(10, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return null;
        }));
        holder.start();
        assertTrue(held.await(5, TimeUnit.SECONDS));

        long start = System.nanoTime();
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> locks.withLock("b", () -> 1));
        long waitedMs = (System.nanoTime() - start) / 1_000_000;
        assertEquals(503, ex.getStatusCode().value());
        assertEquals("board busy", ex.getReason());
        assertTrue(waitedMs >= 1900, "phải chờ ~2s trước khi bỏ cuộc, waited " + waitedMs);
        assertFalse(locks.isHeldByCurrentThread("b"));
        assertEquals(2, locks.withLock("other", () -> 2), "board khác không bị chặn");

        release.countDown();
        holder.join(5000);
        assertEquals(3, locks.withLock("b", () -> 3));
    }
}
