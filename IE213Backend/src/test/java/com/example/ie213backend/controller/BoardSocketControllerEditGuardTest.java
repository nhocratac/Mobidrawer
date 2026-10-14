package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.CanvasPathDto.CreateCanvasPath;
import com.example.ie213backend.domain.dto.ImageDto.DeleteImage;
import com.example.ie213backend.domain.dto.StickyNote.DeleteStickyNote;
import com.example.ie213backend.domain.dto.StickyNote.LockStickyNote;
import com.example.ie213backend.domain.dto.StickyNote.MoveStickyNote;
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
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;

/**
 * Pure-JVM unit test: every mutating STOMP handler goes through
 * BoardAccessService.assertCanEdit (owner or EDITOR) before touching a
 * service, so a VIEWER is denied; cursor stays open to VIEWERs.
 */
class BoardSocketControllerEditGuardTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) needs forward-compatible mode on Java 25.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private static final String BOARD_ID = "board-A";

    private CanvasPathService canvasPathService;
    private StickyNoteService stickyNoteService;
    private ImageService imageService;
    private BoardAccessService boardAccessService;
    private BoardSocketController controller;
    private final UserDto viewer = UserDto.builder().id("u-viewer").firstName("V").lastName("W").build();

    @BeforeEach
    void setUp() {
        canvasPathService = Mockito.mock(CanvasPathService.class);
        stickyNoteService = Mockito.mock(StickyNoteService.class);
        imageService = Mockito.mock(ImageService.class);
        boardAccessService = Mockito.mock(BoardAccessService.class);
        Mockito.doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "denied"))
                .when(boardAccessService).assertCanEdit(BOARD_ID, viewer.getId());
        controller = new BoardSocketController(
                canvasPathService,
                stickyNoteService,
                Mockito.mock(CacheUserInBoardService.class),
                Mockito.mock(BoardService.class),
                imageService,
                boardAccessService);
    }

    private SimpMessageHeaderAccessor accessor() {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionId("sess-1");
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("user", viewer);
        accessor.setSessionAttributes(attrs);
        return accessor;
    }

    private static void assertForbidden(Runnable handlerCall) {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, handlerCall::run);
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void viewer_draw_denied_nothingSaved() {
        assertForbidden(() -> controller.createCanvasPath(BOARD_ID, accessor(), new CreateCanvasPath()));
        Mockito.verifyNoInteractions(canvasPathService);
    }

    @Test
    void viewer_deletePaths_denied_nothingDeleted() {
        assertForbidden(() -> controller.handleDeletePaths(BOARD_ID, List.of("p1"), accessor()));
        Mockito.verifyNoInteractions(canvasPathService);
    }

    @Test
    void viewer_moveStickyNote_denied_nothingUpdated() {
        MoveStickyNote move = new MoveStickyNote("n1", new MoveStickyNote.PositionDTO(1, 2));
        assertForbidden(() -> controller.handleMoveStickyNote(BOARD_ID, accessor(), move));
        Mockito.verifyNoInteractions(stickyNoteService);
    }

    @Test
    void viewer_deleteStickyNote_denied_nothingDeleted() {
        DeleteStickyNote delete = new DeleteStickyNote();
        delete.setId("n1");
        assertForbidden(() -> controller.handleDeleteStickyNote(BOARD_ID, accessor(), delete));
        Mockito.verifyNoInteractions(stickyNoteService);
    }

    @Test
    void viewer_lockStickyNote_denied() {
        LockStickyNote lock = new LockStickyNote();
        lock.setId("n1");
        assertForbidden(() -> controller.handleLockStickyNote(BOARD_ID, accessor(), lock));
    }

    @Test
    void viewer_deleteImage_denied_nothingDeleted() {
        DeleteImage delete = new DeleteImage();
        delete.setId("img1");
        assertForbidden(() -> controller.handleDeleteImage(BOARD_ID, delete, accessor()));
        Mockito.verifyNoInteractions(imageService);
    }

    @Test
    void viewer_cursor_allowed_noEditCheck() {
        Map<String, Object> cursor = new HashMap<>();
        cursor.put("x", 1);
        controller.handleCursorMovement(BOARD_ID, cursor, accessor());
        Mockito.verify(boardAccessService, Mockito.never()).assertCanEdit(anyString(), anyString());
    }
}
