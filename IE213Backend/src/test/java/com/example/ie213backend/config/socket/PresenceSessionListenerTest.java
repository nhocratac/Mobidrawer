package com.example.ie213backend.config.socket;

import com.example.ie213backend.domain.dto.UserDto.PresenceSnapshot;
import com.example.ie213backend.domain.dto.UserDto.PresenceUserDto;
import com.example.ie213backend.service.CacheUserInBoardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

/**
 * Pure-JVM unit test for PresenceSessionListener. No Spring context; the presence
 * service and the messaging template are Mockito mocks.
 */
class PresenceSessionListenerTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) needs forward-compatible mode on Java 25.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private CacheUserInBoardService service;
    private SimpMessageSendingOperations messaging;
    private PresenceSessionListener listener;

    @BeforeEach
    void setUp() {
        service = Mockito.mock(CacheUserInBoardService.class);
        messaging = Mockito.mock(SimpMessageSendingOperations.class);
        listener = new PresenceSessionListener(service, messaging);
    }

    private static SessionDisconnectEvent disconnect(String sessionId, Map<String, Object> attrs) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionId(sessionId);
        accessor.setSessionAttributes(attrs);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        return new SessionDisconnectEvent(new Object(), message, sessionId, CloseStatus.NORMAL);
    }

    @Test
    void disconnect_broadcastsOneSnapshotPerChangedBoard() {
        PresenceSnapshot a = new PresenceSnapshot(7, List.of());
        PresenceSnapshot b = new PresenceSnapshot(8, List.of(new PresenceUserDto("u-bob", "Bob", "B", null, "#123456")));
        Map<String, PresenceSnapshot> changed = new LinkedHashMap<>();
        changed.put("board-A", a);
        changed.put("board-B", b);
        Mockito.when(service.removeSession("s1")).thenReturn(changed);

        listener.onDisconnect(disconnect("s1", new HashMap<>()));

        Mockito.verify(service).removeSession("s1");
        Mockito.verify(messaging).convertAndSend("/topic/board/board-A", (Object) a);
        Mockito.verify(messaging).convertAndSend("/topic/board/board-B", (Object) b);
        Mockito.verifyNoMoreInteractions(messaging);
    }

    @Test
    void disconnect_withNoChangedBoards_sendsNothing() {
        Mockito.when(service.removeSession("s1")).thenReturn(Map.of());

        listener.onDisconnect(disconnect("s1", new HashMap<>()));

        Mockito.verify(messaging, Mockito.never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void disconnect_marksSessionPresenceClosed() {
        Mockito.when(service.removeSession("s1")).thenReturn(Map.of());
        Map<String, Object> attrs = new HashMap<>();

        listener.onDisconnect(disconnect("s1", attrs));

        assertEquals(Boolean.TRUE, attrs.get(PresenceSessionListener.PRESENCE_CLOSED_ATTR));
    }

    @Test
    void applicationReady_clearsAllPresence() {
        listener.onApplicationReady();

        Mockito.verify(service).clearAll();
    }

    @Test
    void applicationReady_redisFailure_doesNotPropagate() {
        Mockito.doThrow(new RuntimeException("redis down")).when(service).clearAll();

        listener.onApplicationReady();

        Mockito.verify(service).clearAll();
    }
}
