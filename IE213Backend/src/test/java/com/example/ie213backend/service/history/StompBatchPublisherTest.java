package com.example.ie213backend.service.history;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class StompBatchPublisherTest {
    SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    StompBatchPublisher publisher = new StompBatchPublisher(messaging);

    @Test
    @SuppressWarnings("unchecked")
    void sendsBatchMessageToElementTopic() {
        List<Map<String, Object>> ops = List.of(Map.of("op", "delete", "ids", List.of("e1")));
        publisher.publish("b1", new BatchEvent("t1", "undo", 5, 6, null, "u1", ops));

        ArgumentCaptor<Object> captor = ArgumentCaptor.forClass(Object.class);
        verify(messaging).convertAndSend(eq("/topic/board/b1/el"), captor.capture());
        Map<String, Object> msg = (Map<String, Object>) captor.getValue();
        assertEquals("batch", msg.get("op"));
        assertEquals("t1", msg.get("txId"));
        assertEquals("undo", msg.get("source"));
        assertEquals(5L, msg.get("seqFrom"));
        assertEquals(6L, msg.get("seqTo"));
        assertTrue(msg.containsKey("senderSessionId"), "senderSessionId luôn có mặt, kể cả null");
        assertNull(msg.get("senderSessionId"));
        assertEquals("u1", msg.get("userId"));
        assertEquals(ops, msg.get("ops"));
        assertEquals(8, msg.size());
    }
}
