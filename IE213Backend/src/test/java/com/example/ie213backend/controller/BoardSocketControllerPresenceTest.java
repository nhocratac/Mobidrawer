package com.example.ie213backend.controller;

import com.example.ie213backend.config.socket.PresenceSessionListener;
import com.example.ie213backend.domain.dto.UserDto.PresenceSnapshot;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.security.BoardAccessService;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.CacheUserInBoardService;
import com.example.ie213backend.service.CanvasPathService;
import com.example.ie213backend.service.ImageService;
import com.example.ie213backend.service.StickyNoteService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

/**
 * Pure-JVM unit test: presence join/leave handlers key by STOMP session id,
 * not by user id, and a join on an already-closed session undoes itself.
 */
class BoardSocketControllerPresenceTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) needs forward-compatible mode on Java 25.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private CacheUserInBoardService presence;
    private BoardSocketController controller;
    private final UserDto alice = UserDto.builder().id("u-alice").firstName("Alice").build();

    @BeforeEach
    void setUp() {
        presence = Mockito.mock(CacheUserInBoardService.class);
        controller = new BoardSocketController(
                Mockito.mock(CanvasPathService.class),
                Mockito.mock(StickyNoteService.class),
                presence,
                Mockito.mock(BoardService.class),
                Mockito.mock(ImageService.class),
                Mockito.mock(BoardAccessService.class));
    }

    private SimpMessageHeaderAccessor accessor(String sessionId, Map<String, Object> attrs) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionId(sessionId);
        attrs.put("user", alice);
        accessor.setSessionAttributes(attrs);
        return accessor;
    }

    @Test
    void join_passesSessionIdNotUserId() {
        PresenceSnapshot snap = new PresenceSnapshot(1, List.of());
        Mockito.when(presence.join("board-A", "sess-1", alice)).thenReturn(snap);

        PresenceSnapshot result = controller.handleUserJoin(accessor("sess-1", new HashMap<>()), "board-A");

        assertSame(snap, result);
        Mockito.verify(presence).join("board-A", "sess-1", alice);
        Mockito.verify(presence, Mockito.never()).leave(anyString(), anyString());
    }

    @Test
    void leave_passesSessionIdNotUserId() {
        PresenceSnapshot snap = new PresenceSnapshot(2, List.of());
        Mockito.when(presence.leave("board-A", "sess-1")).thenReturn(snap);

        PresenceSnapshot result = controller.handleUserLeave(accessor("sess-1", new HashMap<>()), "board-A");

        assertSame(snap, result);
        Mockito.verify(presence).leave("board-A", "sess-1");
    }

    @Test
    void join_onSessionAlreadyClosed_removesItself() {
        Map<String, Object> attrs = new HashMap<>();
        attrs.put(PresenceSessionListener.PRESENCE_CLOSED_ATTR, Boolean.TRUE);
        PresenceSnapshot afterLeave = new PresenceSnapshot(4, List.of());
        Mockito.when(presence.join(anyString(), anyString(), any())).thenReturn(new PresenceSnapshot(3, List.of()));
        Mockito.when(presence.leave("board-A", "sess-1")).thenReturn(afterLeave);

        PresenceSnapshot result = controller.handleUserJoin(accessor("sess-1", attrs), "board-A");

        Mockito.verify(presence).leave("board-A", "sess-1");
        assertSame(afterLeave, result);
    }
}
