package com.example.ie213backend.config.socket;

import org.springframework.context.ApplicationListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

@Component
public class SocketSessionSubscribeEvent implements
        ApplicationListener<SessionSubscribeEvent> {
    @Override
    public void onApplicationEvent(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = headerAccessor.getDestination();
        String sessionId = headerAccessor.getSessionId();
        String userId = "anonymous_" + sessionId;

        if (destination != null && destination.startsWith("/topic/board/")) {
            String boardId = destination.substring("/topic/board/".length());
            //System.out.println("User " + userId + " joined board " + boardId);
        }
    }

}