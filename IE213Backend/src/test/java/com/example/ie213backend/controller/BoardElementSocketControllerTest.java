package com.example.ie213backend.controller;

import com.example.ie213backend.config.socket.ElementLockRegistry;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.element.BoardElementService;
import com.example.ie213backend.service.element.ElementPatches;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BoardElementSocketControllerTest {
    BoardElementService service = mock(BoardElementService.class);
    SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    ElementLockRegistry locks = new ElementLockRegistry();
    BoardElementSocketController controller = new BoardElementSocketController(service, messaging, locks);
    SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create();

    @BeforeEach
    void setUp() {
        UserDto user = new UserDto();
        user.setId("viewer");
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("user", user);
        headers.setSessionAttributes(attrs);
        headers.setSessionId("s1");
    }

    private void viewerIsForbidden() {
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN)).when(service).requireEditor("b", "viewer");
    }

    @Test
    void viewerCannotLockOrUnlock() {
        viewerIsForbidden();
        assertThrows(ResponseStatusException.class, () -> controller.lock("b", Map.of("id", "x"), headers));
        assertThrows(ResponseStatusException.class, () -> controller.unlock("b", Map.of("id", "x"), headers));
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void previewRejectsFieldsOutsideWhitelist() {
        ElementPatches.PatchBody body = new ElementPatches.PatchBody(
                List.of(new ElementPatches.ElementPatch("x", Map.of("type", "image"))));
        assertThrows(IllegalArgumentException.class, () -> controller.preview("b", body, headers));
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void previewRelaysValidGeometry() {
        ElementPatches.PatchBody body = new ElementPatches.PatchBody(
                List.of(new ElementPatches.ElementPatch("x", Map.of("x", 10, "y", 20))));
        controller.preview("b", body, headers);
        verify(messaging).convertAndSend(eq("/topic/board/b/el"), any(Object.class));
    }

    @Test
    void deleteWithNoIdsBroadcastsNothing() {
        when(service.delete("b", "viewer", List.of())).thenReturn(List.of());
        controller.delete("b", Map.of("ids", List.of()), headers);
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void lockOrUnlockOfElementHeldByAnotherUserIsIgnored() {
        locks.lock("other-session", "someone-else", "b", "x");
        controller.lock("b", Map.of("id", "x"), headers);
        controller.unlock("b", Map.of("id", "x"), headers);
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
        assertEquals("someone-else", locks.locksOf("b").get(0).userId());
    }

    @Test
    void disconnectReleasesLocksAndBroadcastsUnlock() {
        controller.lock("b", Map.of("id", "x"), headers);
        reset(messaging);
        controller.releaseSessionLocks("s1");
        verify(messaging).convertAndSend(eq("/topic/board/b/el"), argThat((Object m) ->
                m instanceof Map<?, ?> map && "unlock".equals(map.get("op")) && List.of("x").equals(map.get("ids"))));
        assertTrue(locks.locksOf("b").isEmpty());
    }
}
