package com.example.ie213backend.controller;

import com.example.ie213backend.config.socket.ElementLockRegistry;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.element.BoardElementService;
import com.example.ie213backend.service.element.ElementPatches;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.HistoryService;
import com.example.ie213backend.service.history.SnapshotJob;
import com.example.ie213backend.service.history.UndoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

// M2 (spec §5.2, Review Focus 3): VIEWER và người ngoài gửi bất kỳ /app/board/{id}/el/* đều nhận 403,
// không ghi (writer/mongo), không broadcast, không đổi lock. Dùng service thật + BoardService mock
// để kiểm đúng đường requireEditor / OWNER-restore mà controller dựa vào (M4: không đổi code đó).
class BoardElementSocketControllerAuthzTest {
    static final String B = "650000000000000000000009";
    static final String SID = "s1";
    static final String ACTOR = "actor";
    static final String EDIT_DENIED = "Bạn không có quyền chỉnh sửa bảng này";
    static final String RESTORE_DENIED = "Chỉ chủ bảng mới được khôi phục phiên bản";
    static final String EL_PREFIX = "/board/{boardId}/el/";
    static final ElementLockRegistry.Lock HELD_BY_OTHER = new ElementLockRegistry.Lock("owner-session", "owner", B, "x");

    interface Command {
        void run(BoardElementSocketController c, SimpMessageHeaderAccessor h);
    }

    static final ElementPatches.PatchBody GEOMETRY = new ElementPatches.PatchBody(
            List.of(new ElementPatches.ElementPatch("x", Map.of("x", 10, "y", 20))), null);

    // Mọi lệnh /el/* trừ restore (restore kiểm OWNER, test riêng bên dưới). Thêm handler mới = thêm vào đây.
    static final Map<String, Command> EDIT_COMMANDS = new LinkedHashMap<>();

    static {
        EDIT_COMMANDS.put("create", (c, h) -> c.create(B, Map.of("elements", List.of(sticky())), h));
        EDIT_COMMANDS.put("patch", (c, h) -> c.patch(B, GEOMETRY, h));
        EDIT_COMMANDS.put("preview", (c, h) -> c.preview(B, GEOMETRY, h));
        EDIT_COMMANDS.put("delete", (c, h) -> c.delete(B, Map.of("ids", List.of("x")), h));
        EDIT_COMMANDS.put("lock", (c, h) -> c.lock(B, Map.of("id", "x"), h));
        EDIT_COMMANDS.put("unlock", (c, h) -> c.unlock(B, Map.of("id", "x"), h));
        EDIT_COMMANDS.put("undo", (c, h) -> c.undo(B, h));
        EDIT_COMMANDS.put("redo", (c, h) -> c.redo(B, h));
    }

    private static BoardElement sticky() {
        BoardElement e = new BoardElement();
        e.setId("650000000000000000000001");
        e.setType("sticky");
        e.setW(200);
        e.setH(200);
        return e;
    }

    BoardElementRepository repo = mock(BoardElementRepository.class);
    BoardService boardService = mock(BoardService.class);
    ElementWriter writer = mock(ElementWriter.class);
    MongoTemplate mongo = mock(MongoTemplate.class);
    SnapshotJob snapshotJob = mock(SnapshotJob.class);
    UserRepository userRepository = mock(UserRepository.class);
    SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    ElementLockRegistry locks = new ElementLockRegistry();

    BoardElementService elementService = new BoardElementService(repo, boardService, writer);
    UndoService undoService = new UndoService(writer, mongo, boardService);
    HistoryService historyService = new HistoryService(writer, snapshotJob, boardService, userRepository, mongo);
    BoardElementSocketController controller =
            new BoardElementSocketController(elementService, messaging, locks, undoService, historyService);
    SimpMessageHeaderAccessor headers = SimpMessageHeaderAccessor.create();

    @BeforeEach
    void setUp() {
        UserDto user = new UserDto();
        user.setId(ACTOR);
        Map<String, Object> attrs = new HashMap<>();
        attrs.put("user", user);
        headers.setSessionAttributes(attrs);
        headers.setSessionId(SID);
        // "x" đang do người khác giữ: lệnh bị 403 không được gỡ hay ghi đè lock này
        locks.lock(HELD_BY_OTHER.sessionId(), HELD_BY_OTHER.userId(), B, HELD_BY_OTHER.elementId());
    }

    private void role(String role) {
        when(boardService.getRoleOfMember(B, ACTOR)).thenReturn(role);
    }

    // không DB (writer, mongo, snapshot, repo), không broadcast, lock giữ nguyên
    private void assertNoSideEffects() {
        verifyNoInteractions(writer, mongo, snapshotJob, repo, messaging);
        assertEquals(List.of(HELD_BY_OTHER), locks.locksOf(B));
    }

    static Stream<Arguments> deniedRoleByCommand() {
        return Stream.of("VIEWER", "NONE").flatMap(role ->
                EDIT_COMMANDS.keySet().stream().map(cmd -> Arguments.of(role, cmd)));
    }

    @ParameterizedTest(name = "{0} {1} -> 403, no write, no broadcast")
    @MethodSource("deniedRoleByCommand")
    void nonEditorCommandIs403WithoutSideEffects(String role, String cmd) {
        role(role);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> EDIT_COMMANDS.get(cmd).run(controller, headers));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals(EDIT_DENIED, ex.getReason());
        // đường về client: @MessageExceptionHandler -> /user/queue/errors
        assertEquals(Map.of("reason", EDIT_DENIED), controller.onError(ex));
        verify(boardService).getRoleOfMember(B, ACTOR);
        assertNoSideEffects();
    }

    @ParameterizedTest(name = "{0} restore -> 403")
    @ValueSource(strings = {"EDITOR", "VIEWER", "NONE"})
    void restoreByNonOwnerIs403WithoutSideEffects(String role) {
        role(role);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> controller.restore(B, Map.of("seq", 3), headers));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertEquals(RESTORE_DENIED, ex.getReason());
        assertEquals(Map.of("reason", RESTORE_DENIED), controller.onError(ex));
        verify(boardService).getRoleOfMember(B, ACTOR);
        assertNoSideEffects();
    }

    @Test
    void viewerPreviewIsRefusedOnRoleBeforePatchWhitelist() {
        role("VIEWER");
        // patch ngoài whitelist: phải là 403 (quyền kiểm trước), không phải IllegalArgumentException
        ElementPatches.PatchBody bad = new ElementPatches.PatchBody(
                List.of(new ElementPatches.ElementPatch("x", Map.of("type", "image"))), null);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> controller.preview(B, bad, headers));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        assertNoSideEffects();
    }

    // Đối chứng: cùng dây mock, EDITOR được relay preview -> chứng minh 403 ở trên là do role, không do mock hỏng
    @Test
    void editorPreviewIsRelayedControl() {
        role("EDITOR");
        controller.preview(B, GEOMETRY, headers);
        verify(messaging).convertAndSend(eq("/topic/board/" + B + "/el"), any(Object.class));
        verifyNoInteractions(writer, mongo, snapshotJob, repo);
    }

    // Đối chứng: OWNER restore đi tới writer.withLock (thay đổi thật đi qua batch của writer)
    @Test
    void ownerRestoreReachesWriterLockControl() {
        role("OWNER");
        controller.restore(B, Map.of("seq", 3), headers);
        verify(writer).withLock(eq(B), any());
        verifyNoInteractions(messaging);
    }

    // Handler /el/* mới mà chưa vào EDIT_COMMANDS (hoặc không phải restore) thì build đỏ
    @Test
    void everyElHandlerIsInTheAuthzMatrix() {
        Set<String> covered = new HashSet<>(EDIT_COMMANDS.keySet());
        covered.add("restore");
        Set<String> mapped = new HashSet<>();
        for (Method m : BoardElementSocketController.class.getDeclaredMethods()) {
            MessageMapping mm = m.getAnnotation(MessageMapping.class);
            if (mm == null) continue;
            for (String path : mm.value()) {
                assertTrue(path.startsWith(EL_PREFIX), "handler ngoài /el/*: " + path);
                mapped.add(path.substring(EL_PREFIX.length()));
            }
        }
        assertEquals(covered, mapped, "thêm handler /el/* mới thì phải thêm vào EDIT_COMMANDS (hoặc restore)");
        assertEquals(9, mapped.size());
    }
}
