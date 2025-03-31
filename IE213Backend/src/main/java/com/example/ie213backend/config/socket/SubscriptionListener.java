package com.example.ie213backend.config.socket;

import org.springframework.context.ApplicationListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.Collections;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SubscriptionListener implements ApplicationListener<SessionSubscribeEvent> {

    private final Map<String, Set<String>> topicSubscribers = new ConcurrentHashMap<>();

    @Override
    public void onApplicationEvent(SessionSubscribeEvent event) {
        SimpMessageHeaderAccessor headerAccessor = SimpMessageHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        String destination = headerAccessor.getDestination();

        if (destination != null && destination.startsWith("/topic/board/moveStickyNote/")) {
            topicSubscribers.computeIfAbsent(destination, k -> new HashSet<>()).add(sessionId);
            System.out.println("Session " + sessionId + " subscribed to " + destination);
        }
    }

    public Set<String> getSubscribers(String destination) {
        return topicSubscribers.getOrDefault(destination, Collections.emptySet());
    }
}