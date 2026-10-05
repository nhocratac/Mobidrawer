package com.example.ie213backend.service.history;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

// Phát batch lên cùng topic element như BoardElementSocketController.send
@Component
@RequiredArgsConstructor
public class StompBatchPublisher implements BatchPublisher {
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publish(String boardId, BatchEvent event) {
        // HashMap vì senderSessionId có thể null
        Map<String, Object> message = new HashMap<>();
        message.put("op", "batch");
        message.put("txId", event.txId());
        message.put("source", event.source());
        message.put("seqFrom", event.seqFrom());
        message.put("seqTo", event.seqTo());
        message.put("senderSessionId", event.senderSessionId());
        message.put("userId", event.userId());
        message.put("ops", event.ops());
        messagingTemplate.convertAndSend("/topic/board/" + boardId + "/el", message);
    }
}
