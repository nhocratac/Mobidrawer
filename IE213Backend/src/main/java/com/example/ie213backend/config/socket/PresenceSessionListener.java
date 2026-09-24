package com.example.ie213backend.config.socket;

import com.example.ie213backend.domain.dto.UserDto.PresenceSnapshot;
import com.example.ie213backend.service.CacheUserInBoardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.Map;

/**
 * Removes a STOMP session from every board it joined when the session ends
 * (tab close, missed heartbeats, DISCONNECT frame, auth deny) and broadcasts
 * the new snapshot to each board that changed. Wipes stale presence on startup.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PresenceSessionListener {
    /** Session attribute set on disconnect so a late-processed join can undo itself. */
    public static final String PRESENCE_CLOSED_ATTR = "presenceClosed";

    private final CacheUserInBoardService cacheUserInBoardService;
    private final SimpMessageSendingOperations messagingTemplate;

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        Map<String, Object> attrs = SimpMessageHeaderAccessor.getSessionAttributes(event.getMessage().getHeaders());
        if (attrs != null) {
            attrs.put(PRESENCE_CLOSED_ATTR, Boolean.TRUE);
        }
        String sessionId = event.getSessionId();
        if (sessionId == null) {
            return;
        }
        Map<String, PresenceSnapshot> changed = cacheUserInBoardService.removeSession(sessionId);
        changed.forEach((boardId, snapshot) ->
                messagingTemplate.convertAndSend("/topic/board/" + boardId, snapshot));
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        try {
            cacheUserInBoardService.clearAll();
        } catch (RuntimeException e) {
            // Redis unavailable at startup must not stop the app; TTL is the backstop.
            log.warn("Presence: startup cleanup failed: {}", e.getMessage());
        }
    }
}
