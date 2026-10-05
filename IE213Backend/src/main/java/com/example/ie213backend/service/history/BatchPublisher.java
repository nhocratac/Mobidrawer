package com.example.ie213backend.service.history;

// Seam broadcast để test thay bằng fake
public interface BatchPublisher {
    void publish(String boardId, BatchEvent event);
}
