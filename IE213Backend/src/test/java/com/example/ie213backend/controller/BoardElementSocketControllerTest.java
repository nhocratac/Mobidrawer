package com.example.ie213backend.controller;

import com.example.ie213backend.config.socket.ElementLockRegistry;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.service.element.BoardElementService;
import com.example.ie213backend.service.element.ElementPatches;
import com.example.ie213backend.service.history.HistoryResult;
import com.example.ie213backend.service.history.HistoryService;
import com.example.ie213backend.service.history.UndoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class BoardElementSocketControllerTest {
    BoardElementService service = mock(BoardElementService.class);
    SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    ElementLockRegistry locks = new ElementLockRegistry();
    UndoService undo = mock(UndoService.class);
    HistoryService history = mock(HistoryService.class);
    BoardElementSocketController controller = new BoardElementSocketController(service, messaging, locks, undo, history);
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
                List.of(new ElementPatches.ElementPatch("x", Map.of("type", "image"))), null);
        assertThrows(IllegalArgumentException.class, () -> controller.preview("b", body, headers));
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void previewRelaysValidGeometry() {
        ElementPatches.PatchBody body = new ElementPatches.PatchBody(
                List.of(new ElementPatches.ElementPatch("x", Map.of("x", 10, "y", 20))), null);
        controller.preview("b", body, headers);
        verify(messaging).convertAndSend(eq("/topic/board/b/el"), any(Object.class));
    }

    @Test
    void deleteWithNoIdsBroadcastsNothing() {
        when(service.delete("b", "viewer", "s1", List.of())).thenReturn(List.of());
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

    @Test
    void createPassesSessionAndDoesNotBroadcastItself() {
        BoardElement e = new BoardElement();
        when(service.create("b", "viewer", "s1", List.of(e))).thenReturn(List.of(e));
        controller.create("b", Map.of("elements", List.of(e)), headers);
        verify(service).create("b", "viewer", "s1", List.of(e));
        verifyNoInteractions(messaging);
    }

    @Test
    void patchForwardsMergeKeyAndDoesNotBroadcastItself() {
        List<ElementPatches.ElementPatch> patches = List.of(new ElementPatches.ElementPatch("x", Map.of("text", "hi")));
        when(service.patch("b", "viewer", "s1", patches, "text:x:ed1"))
                .thenReturn(List.of(Map.of("id", "x", "set", Map.of("text", "hi"), "version", 2L)));
        controller.patch("b", new ElementPatches.PatchBody(patches, "text:x:ed1"), headers);
        verify(service).patch("b", "viewer", "s1", patches, "text:x:ed1");
        verifyNoInteractions(messaging);
    }

    @Test
    void latePatchForDeletedElementSendsNothing() {
        // Review Focus 3: service trả rỗng (writer EMPTY) thì không gửi gì, không lỗi
        List<ElementPatches.ElementPatch> patches = List.of(new ElementPatches.ElementPatch("gone", Map.of("text", "late")));
        when(service.patch("b", "viewer", "s1", patches, "text:gone:ed1")).thenReturn(List.of());
        assertDoesNotThrow(() -> controller.patch("b", new ElementPatches.PatchBody(patches, "text:gone:ed1"), headers));
        verifyNoInteractions(messaging);
    }

    @Test
    void deleteDoesNotBroadcastItself() {
        when(service.delete("b", "viewer", "s1", List.of("e1"))).thenReturn(List.of("e1", "c1"));
        controller.delete("b", Map.of("ids", List.of("e1")), headers);
        verify(service).delete("b", "viewer", "s1", List.of("e1"));
        verifyNoInteractions(messaging);
    }

    @Test
    void viewerPatchIsForbiddenAndSendsNothing() {
        List<ElementPatches.ElementPatch> patches = List.of(new ElementPatches.ElementPatch("x", Map.of("x", 1)));
        when(service.patch("b", "viewer", "s1", patches, null)).thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN));
        assertThrows(ResponseStatusException.class,
                () -> controller.patch("b", new ElementPatches.PatchBody(patches, null), headers));
        verifyNoInteractions(messaging);
    }

    @Test
    void undoAndRedoDelegateWithUserAndSessionAndReplyOnHistoryQueue() throws Exception {
        HistoryResult undone = new HistoryResult("undo", 1, List.of());
        when(undo.undo("b", "viewer", "s1")).thenReturn(undone);
        when(undo.redo("b", "viewer", "s1")).thenReturn(HistoryResult.empty("redo"));

        assertEquals(undone, controller.undo("b", headers));
        assertEquals(HistoryResult.empty("redo"), controller.redo("b", headers));
        for (String name : List.of("undo", "redo")) {
            Method m = BoardElementSocketController.class.getMethod(name, String.class, SimpMessageHeaderAccessor.class);
            assertArrayEquals(new String[]{"/board/{boardId}/el/" + name}, m.getAnnotation(MessageMapping.class).value());
            assertArrayEquals(new String[]{"/queue/history"}, m.getAnnotation(SendToUser.class).destinations());
        assertFalse(m.getAnnotation(SendToUser.class).broadcast());
        }
        // kết quả chỉ về người bấm; batch do writer broadcast
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void viewerUndoIsForbiddenAndReportedOnErrorsQueue() {
        ResponseStatusException forbidden = new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa bảng này");
        when(undo.undo("b", "viewer", "s1")).thenThrow(forbidden);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> controller.undo("b", headers));
        assertEquals(Map.of("reason", "Bạn không có quyền chỉnh sửa bảng này"), controller.onError(ex));
    }

    @Test
    void restoreDelegatesSeqUserAndSessionAndRepliesOnHistoryQueue() throws Exception {
        HistoryResult restored = new HistoryResult("restore", 2, List.of());
        when(history.restore("b", "viewer", "s1", 7L)).thenReturn(restored);

        assertEquals(restored, controller.restore("b", Map.of("seq", 7), headers));
        Method m = BoardElementSocketController.class.getMethod("restore", String.class, Map.class, SimpMessageHeaderAccessor.class);
        assertArrayEquals(new String[]{"/board/{boardId}/el/restore"}, m.getAnnotation(MessageMapping.class).value());
        assertArrayEquals(new String[]{"/queue/history"}, m.getAnnotation(SendToUser.class).destinations());
        assertFalse(m.getAnnotation(SendToUser.class).broadcast());
        // thay đổi thật đi qua batch của writer, controller không tự broadcast
        verify(messaging, never()).convertAndSend(anyString(), any(Object.class));
    }

    @Test
    void restoreWithoutNumericSeqIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> controller.restore("b", Map.of(), headers));
        assertThrows(IllegalArgumentException.class, () -> controller.restore("b", Map.of("seq", "7"), headers));
        verifyNoInteractions(history);
    }
}
