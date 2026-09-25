package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.NotificationDto.MarkNotificationAsReadDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.security.BoardAccessService;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;

/**
 * Pure-JVM controller tests (no Spring context): GET /users is ADMIN-only,
 * getMembersDetail requires board access, notification mark-read uses the JWT user.
 */
class RestIdorControllerTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) needs forward-compatible mode on Java 25.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private final UserDto alice = UserDto.builder().id("u-alice").build();

    @Test
    void listUsers_isAdminOnly_sameExpressionAsBlogController() throws Exception {
        PreAuthorize pre = UserController.class.getMethod("listUsers").getAnnotation(PreAuthorize.class);

        assertNotNull(pre, "GET /users must be guarded by @PreAuthorize");
        assertEquals("hasRole('ADMIN')", pre.value());
    }

    @Test
    void getMembersDetail_nonMember_403_andNoLookup() {
        BoardService boardService = Mockito.mock(BoardService.class);
        BoardAccessService access = Mockito.mock(BoardAccessService.class);
        Mockito.when(access.canAccess("board-B", "u-alice")).thenReturn(false);
        BoardController controller = new BoardController(boardService, access);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.getMembersDetail("board-B", alice));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        Mockito.verify(boardService, Mockito.never()).getMembersDetail(anyString());
    }

    @Test
    void getMembersDetail_member_returnsMembers() {
        BoardService boardService = Mockito.mock(BoardService.class);
        BoardAccessService access = Mockito.mock(BoardAccessService.class);
        Mockito.when(access.canAccess("board-A", "u-alice")).thenReturn(true);
        Mockito.when(boardService.getMembersDetail("board-A")).thenReturn(List.of());
        BoardController controller = new BoardController(boardService, access);

        assertEquals(HttpStatus.OK, controller.getMembersDetail("board-A", alice).getStatusCode());
    }

    @Test
    void markAsRead_usesJwtUser_notBody() throws Exception {
        NotificationService notificationService = Mockito.mock(NotificationService.class);
        NotificationController controller = new NotificationController(notificationService);
        // Legacy clients still send "userId"; it must be ignored rather than bound or rejected.
        MarkNotificationAsReadDto body = new ObjectMapper().readValue(
                "{\"userId\":\"victim-1\",\"notificationIds\":[\"n-1\"]}", MarkNotificationAsReadDto.class);

        controller.markAsRead(body, alice);

        Mockito.verify(notificationService).markNotificationAsRead("u-alice", List.of("n-1"));
    }
}
