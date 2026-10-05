package com.example.ie213backend.config.socket;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ElementLockRegistryTest {
    ElementLockRegistry registry = new ElementLockRegistry();

    @Test
    void releaseSessionReturnsItsLocks() {
        registry.lock("s1", "u1", "b", "e1");
        registry.lock("s1", "u1", "b", "e2");
        registry.lock("s2", "u2", "b", "e3");
        List<ElementLockRegistry.Lock> released = registry.releaseSession("s1");
        assertEquals(2, released.size());
        assertTrue(released.stream().allMatch(l -> l.boardId().equals("b") && l.userId().equals("u1")));
        assertTrue(registry.releaseSession("s1").isEmpty());
        assertEquals(1, registry.releaseSession("s2").size());
    }

    @Test
    void cannotLockElementHeldByAnotherUser() {
        assertTrue(registry.lock("s1", "u1", "b", "e1"));
        assertFalse(registry.lock("s2", "u2", "b", "e1"));
        assertTrue(registry.lock("s3", "u1", "b", "e1"));
    }

    @Test
    void onlyHolderCanUnlock() {
        registry.lock("s1", "u1", "b", "e1");
        assertFalse(registry.unlock("u2", "b", "e1"));
        assertTrue(registry.unlock("u1", "b", "e1"));
        assertTrue(registry.unlock("u2", "b", "e1"), "unlocking a free element is a no-op success");
        assertTrue(registry.releaseSession("s1").isEmpty());
    }

    @Test
    void locksOfBoard() {
        registry.lock("s1", "u1", "b", "e1");
        registry.lock("s1", "u1", "other", "e2");
        assertEquals(List.of("e1"), registry.locksOf("b").stream().map(ElementLockRegistry.Lock::elementId).toList());
    }
}
