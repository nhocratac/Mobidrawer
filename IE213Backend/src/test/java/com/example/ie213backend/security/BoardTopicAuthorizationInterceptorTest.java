package com.example.ie213backend.security;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.CanvaPathRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Sort;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.example.ie213backend.security.BoardTopicAuthorizationInterceptor.extractBoardId;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure-JVM unit tests for BoardTopicAuthorizationInterceptor (SEC-3): hand-rolled
 * fake repositories, a counting BoardAccessService subclass, and real Message
 * objects built via StompHeaderAccessor + MessageBuilder. No Mockito, no Spring
 * context. Covers the required 34-case matrix: 7 parser + 9 subscribe +
 * 7 guarded-send + 4 pass-through + 7 canAccess.
 */
class BoardTopicAuthorizationInterceptorTest {

    private static final String OWNER_ID = "owner-1";
    private static final String EDITOR_ID = "editor-1";
    private static final String VIEWER_ID = "viewer-1";
    private static final String STRANGER_ID = "stranger-1";
    private static final String BOARD_ID = "board-1";
    private static final String OTHER_BOARD_ID = "board-2";
    private static final String OTHER_OWNER_ID = "owner-2";
    private static final String OBJECT_ID = "650000000000000000000001";

    /**
     * Spec §3: 17 op của dạng /topic/board/{op}/{id}. Liệt kê tay ở đây để test độc lập với
     * interceptor; ops_constantMatchesSpecList giữ 2 danh sách đồng bộ.
     */
    private static final List<String> SPEC_OPS = List.of(
            "addStickyNote", "addStickyNotes", "ChangeTextStickyNote", "cursor", "delete-paths",
            "deleteImage", "deleteStickyNote", "image", "images", "lockStickyNote", "move-paths",
            "moveImage", "moveStickyNote", "resizeImage", "reSizeStickyNote", "unLockStickyNote", "update-paths");

    private FakeBoardRepository boardRepository;
    private CountingBoardAccessService boardAccessService;
    private BoardTopicAuthorizationInterceptor interceptor;

    @BeforeEach
    void setUp() {
        boardRepository = new FakeBoardRepository();
        boardAccessService = new CountingBoardAccessService(boardRepository, new FakeCanvaPathRepository());
        interceptor = new BoardTopicAuthorizationInterceptor(boardAccessService);

        Board board = new Board();
        board.setId(BOARD_ID);
        board.setOwner(OWNER_ID);
        List<Board.Member> members = new ArrayList<>();
        members.add(new Board.Member(EDITOR_ID, Board.ROLE.EDITOR));
        members.add(new Board.Member(VIEWER_ID, Board.ROLE.VIEWER));
        board.setMembers(members);
        boardRepository.seed(board);

        Board otherBoard = new Board();
        otherBoard.setId(OTHER_BOARD_ID);
        otherBoard.setOwner(OTHER_OWNER_ID);
        otherBoard.setMembers(new ArrayList<>());
        boardRepository.seed(otherBoard);
    }

    // ---- PARSER (7) ----
    @Test void parser_boardTopic() { assertEquals("B1", BoardTopicAuthorizationInterceptor.extractBoardId("/topic/board/B1")); }
    @Test void parser_drawBoardTopic() { assertEquals("B1", BoardTopicAuthorizationInterceptor.extractBoardId("/topic/draw/board/B1")); }
    @Test void parser_opBoardTopic() { assertEquals("B1", BoardTopicAuthorizationInterceptor.extractBoardId("/topic/board/cursor/B1")); }
    @Test void parser_bareBoardTopic_noMatch() { assertNull(BoardTopicAuthorizationInterceptor.extractBoardId("/topic/board")); }
    @Test void parser_nonBoardTopic_noMatch() { assertNull(BoardTopicAuthorizationInterceptor.extractBoardId("/topic/other/B1")); }
    @Test void parser_nullDestination_noMatch() { assertNull(BoardTopicAuthorizationInterceptor.extractBoardId(null)); }
    @Test void parser_trailingSlash_noMatch() { assertNull(BoardTopicAuthorizationInterceptor.extractBoardId("/topic/draw/board/B1/")); }

    // ---- SUBSCRIBE (9) ----
    @Test
    void subscribe_memberAllowed_cachePopulated() {
        Map<String, Object> session = sessionOf(EDITOR_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/board/" + BOARD_ID, session);
        assertEquals(subscribe, interceptor.preSend(subscribe, mockChannel()));
        assertTrue(authorizedBoards(session).contains(BOARD_ID));
    }

    @Test
    void subscribe_nonMember_denied_cacheEmpty() {
        Map<String, Object> session = sessionOf(STRANGER_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/board/" + BOARD_ID, session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertFalse(authorizedBoards(session).contains(BOARD_ID));
    }

    @Test
    void subscribe_missingSessionUser_denied() {
        Message<byte[]> subscribe = subscribeMessage("/topic/board/" + BOARD_ID, new HashMap<>());
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
    }

    @Test
    void subscribe_nonBoardTopic_denied() {
        Message<byte[]> subscribe = subscribeMessage("/topic/notboard/" + BOARD_ID, sessionOf(OWNER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
    }

    @Test
    void subscribe_userQueueSession_allowedWithoutBoardCheck() {
        Message<byte[]> subscribe = subscribeMessage("/user/queue/session", sessionOf(STRANGER_ID));
        assertEquals(subscribe, interceptor.preSend(subscribe, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void subscribe_wildcardDoubleStarTopic_denied() {
        Map<String, Object> session = sessionOf(OWNER_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/**", session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertTrue(authorizedBoards(session).isEmpty());
    }

    @Test
    void subscribe_wildcardStarTopic_denied() {
        Map<String, Object> session = sessionOf(OWNER_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/*", session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertTrue(authorizedBoards(session).isEmpty());
    }

    @Test
    void subscribe_wildcardBoardDoubleStar_denied() {
        Map<String, Object> session = sessionOf(OWNER_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/board/**", session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertTrue(authorizedBoards(session).isEmpty());
    }

    @Test
    void subscribe_wildcardBoardStar_denied() {
        Map<String, Object> session = sessionOf(OWNER_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/board/*", session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertTrue(authorizedBoards(session).isEmpty());
    }

    // ---- GUARDED SEND (7) ----
    @Test
    void send_cursor_fallbackAllows_cachePopulated() {
        Map<String, Object> session = sessionOf(VIEWER_ID);
        Message<byte[]> send = sendMessage("/app/board/cursor/" + BOARD_ID, session);
        assertEquals(send, interceptor.preSend(send, mockChannel()));
        assertEquals(1, boardAccessService.canAccessCalls);
        assertTrue(authorizedBoards(session).contains(BOARD_ID));
    }

    @Test
    void send_cursor_cacheHit_canAccessCountUnchanged() {
        Map<String, Object> session = sessionOf(VIEWER_ID);
        // Establish the proof via SUBSCRIBE first (normal client flow).
        interceptor.preSend(subscribeMessage("/topic/board/" + BOARD_ID, session), mockChannel());
        int countAfterProof = boardAccessService.canAccessCalls;
        assertEquals(1, countAfterProof);

        for (int i = 0; i < 5; i++) {
            interceptor.preSend(sendMessage("/app/board/cursor/" + BOARD_ID, session), mockChannel());
        }
        assertEquals(countAfterProof, boardAccessService.canAccessCalls);
    }

    @Test
    void send_cursor_nonMember_denied() {
        Message<byte[]> send = sendMessage("/app/board/cursor/" + BOARD_ID, sessionOf(STRANGER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    @Test
    void send_join_nonMember_denied() {
        Message<byte[]> send = sendMessage("/app/board/join/" + BOARD_ID, sessionOf(STRANGER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    @Test
    void send_leave_nonMember_denied() {
        Message<byte[]> send = sendMessage("/app/board/leave/" + BOARD_ID, sessionOf(STRANGER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    @Test
    void send_guardedOp_missingUser_denied() {
        Message<byte[]> send = sendMessage("/app/board/cursor/" + BOARD_ID, new HashMap<>());
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    @Test
    void send_guardedOp_emptyBoardId_denied() {
        Message<byte[]> send = sendMessage("/app/board/cursor/", sessionOf(OWNER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    // ---- PASS-THROUGH (4) ----
    @Test
    void send_drawDestination_passesThrough_zeroAuthorizationCalls() {
        Message<byte[]> send = sendMessage("/app/board/draw/" + BOARD_ID, sessionOf(STRANGER_ID));
        assertEquals(send, interceptor.preSend(send, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void connect_passesThrough() {
        Message<byte[]> connect = stompMessage(StompCommand.CONNECT, null, new HashMap<>());
        assertEquals(connect, interceptor.preSend(connect, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void unsubscribe_passesThrough() {
        Message<byte[]> unsubscribe = stompMessage(StompCommand.UNSUBSCRIBE, null, new HashMap<>());
        assertEquals(unsubscribe, interceptor.preSend(unsubscribe, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void nullCommandHeartbeat_passesThrough() {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionAttributes(new HashMap<>());
        accessor.setLeaveMutable(true);
        Message<byte[]> heartbeat = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertNull(StompHeaderAccessor.wrap(heartbeat).getCommand()); // confirm null command before asserting pass-through
        assertEquals(heartbeat, interceptor.preSend(heartbeat, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    // ---- CANACCESS truth table (7) ----
    @Test void canAccess_owner_true() { assertTrue(boardAccessService.canAccess(BOARD_ID, OWNER_ID)); }
    @Test void canAccess_viewerMember_true() { assertTrue(boardAccessService.canAccess(BOARD_ID, VIEWER_ID)); }
    @Test void canAccess_nonMember_false() { assertFalse(boardAccessService.canAccess(BOARD_ID, STRANGER_ID)); }
    @Test void canAccess_nullUserId_false() { assertFalse(boardAccessService.canAccess(BOARD_ID, null)); }
    @Test void canAccess_missingBoard_false() { assertFalse(boardAccessService.canAccess("no-such-board", OWNER_ID)); }
    @Test void canAccess_nullBoardId_falseNoNpe() { assertFalse(boardAccessService.canAccess(null, OWNER_ID)); }
    @Test void canAccess_blankBoardId_false() { assertFalse(boardAccessService.canAccess("   ", OWNER_ID)); }

    // ---- M1 PARSER: exhaustive topic shapes (14) ----
    @Test void parser_elTopic() { assertEquals("B1", extractBoardId("/topic/board/B1/el")); }
    @Test void parser_elTopic_objectId() { assertEquals(OBJECT_ID, extractBoardId("/topic/board/" + OBJECT_ID + "/el")); }
    @Test void parser_allSeventeenOps_resolve() {
        for (String op : SPEC_OPS) {
            assertEquals("B1", extractBoardId("/topic/board/" + op + "/B1"), "op topic must resolve: " + op);
        }
    }
    @Test void parser_bareEl_noMatch() { assertNull(extractBoardId("/topic/board/el")); }
    @Test void parser_elExtraSegment_noMatch() { assertNull(extractBoardId("/topic/board/B1/el/x")); }
    @Test void parser_unknownSuffix_noMatch() { assertNull(extractBoardId("/topic/board/B1/unknown")); }
    @Test void parser_unknownOp_noMatch() { assertNull(extractBoardId("/topic/board/unknownOp/B1")); }
    @Test void parser_idIsOpName_noMatch() { assertNull(extractBoardId("/topic/board/cursor")); }
    @Test void parser_opThenEl_noMatch() { assertNull(extractBoardId("/topic/board/cursor/el")); }
    @Test void parser_emptyId_noMatch() { assertNull(extractBoardId("/topic/board//el")); }
    @Test void parser_wildcardDoubleStar_noMatch() { assertNull(extractBoardId("/topic/**")); }
    @Test void parser_wildcardBoardStar_noMatch() { assertNull(extractBoardId("/topic/board/*")); }
    @Test void parser_wildcardBoardDoubleStar_noMatch() { assertNull(extractBoardId("/topic/board/**")); }
    @Test void parser_drawWithOp_noMatch() { assertNull(extractBoardId("/topic/draw/board/cursor/B1")); }

    // ---- M1 SUBSCRIBE: /el topic + fail-closed before lookup (10) ----
    @Test
    void subscribe_elTopic_memberAllowed_cachePopulated() {
        Map<String, Object> session = sessionOf(EDITOR_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/board/" + BOARD_ID + "/el", session);
        assertEquals(subscribe, interceptor.preSend(subscribe, mockChannel()));
        assertEquals(1, boardAccessService.canAccessCalls);
        assertTrue(authorizedBoards(session).contains(BOARD_ID));
    }

    @Test
    void subscribe_elTopic_viewerAllowed() {
        Map<String, Object> session = sessionOf(VIEWER_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/board/" + BOARD_ID + "/el", session);
        assertEquals(subscribe, interceptor.preSend(subscribe, mockChannel()));
        assertTrue(authorizedBoards(session).contains(BOARD_ID));
    }

    @Test
    void subscribe_elTopic_nonMember_denied_cacheEmpty() {
        Map<String, Object> session = sessionOf(STRANGER_ID);
        Message<byte[]> subscribe = subscribeMessage("/topic/board/" + BOARD_ID + "/el", session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertFalse(authorizedBoards(session).contains(BOARD_ID));
    }

    /** Review Focus 4: member of board A subscribing to /topic/board/{B}/el is denied; A's proof does not leak to B. */
    @Test
    void subscribe_elTopic_memberOfOtherBoard_denied() {
        Map<String, Object> session = sessionOf(EDITOR_ID);
        interceptor.preSend(subscribeMessage("/topic/board/" + BOARD_ID + "/el", session), mockChannel());
        assertTrue(authorizedBoards(session).contains(BOARD_ID));

        Message<byte[]> cross = subscribeMessage("/topic/board/" + OTHER_BOARD_ID + "/el", session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(cross, mockChannel()));
        assertEquals(2, boardAccessService.canAccessCalls);
        assertFalse(authorizedBoards(session).contains(OTHER_BOARD_ID));
    }

    @Test
    void subscribe_bareEl_denied_beforeLookup() {
        Message<byte[]> subscribe = subscribeMessage("/topic/board/el", sessionOf(OWNER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void subscribe_elExtraSegment_denied_beforeLookup() {
        Message<byte[]> subscribe = subscribeMessage("/topic/board/" + BOARD_ID + "/el/x", sessionOf(OWNER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void subscribe_unknownSuffix_denied_beforeLookup() {
        Message<byte[]> subscribe = subscribeMessage("/topic/board/" + BOARD_ID + "/unknown", sessionOf(OWNER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void subscribe_wildcardBoardStar_denied_beforeLookup() {
        Message<byte[]> subscribe = subscribeMessage("/topic/board/*", sessionOf(OWNER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void subscribe_wildcardDoubleStar_denied_beforeLookup() {
        Message<byte[]> subscribe = subscribeMessage("/topic/**", sessionOf(OWNER_ID));
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    @Test
    void subscribe_queueDestination_passesWithoutBoardCheck() {
        Message<byte[]> subscribe = subscribeMessage("/queue/errors", sessionOf(STRANGER_ID));
        assertEquals(subscribe, interceptor.preSend(subscribe, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    // ---- M1 SEND handling intact (2) ----
    @Test
    void send_cursor_cacheHitFromElSubscribe_zeroExtraLookups() {
        Map<String, Object> session = sessionOf(EDITOR_ID);
        interceptor.preSend(subscribeMessage("/topic/board/" + BOARD_ID + "/el", session), mockChannel());
        assertEquals(1, boardAccessService.canAccessCalls);
        for (int i = 0; i < 5; i++) {
            interceptor.preSend(sendMessage("/app/board/cursor/" + BOARD_ID, session), mockChannel());
        }
        assertEquals(1, boardAccessService.canAccessCalls);
    }

    @Test
    void send_elAppDestination_passesThrough_zeroAuthorizationCalls() {
        Message<byte[]> send = sendMessage("/app/board/" + BOARD_ID + "/el/patch", sessionOf(STRANGER_ID));
        assertEquals(send, interceptor.preSend(send, mockChannel()));
        assertEquals(0, boardAccessService.canAccessCalls);
    }

    // ---- M1 EXHAUSTIVE SCAN (Review Focus 1) (3) ----
    /**
     * Quét mọi string literal "/topic/..." trong src/main/java (trừ chính interceptor, vì nó chứa
     * prefix "/topic/" dùng để so khớp) và bắt từng dạng phải resolve ra đúng {id}. Thêm topic mới
     * mà quên cập nhật extractBoardId/BOARD_TOPIC_OPS thì test này đỏ ở build, thay vì âm thầm
     * từ chối subscriber trên production.
     *
     * Quy tắc chuẩn hoá literal -> shape (normaliseTopicLiterals):
     *  1. Literal có placeholder kiểu @SendTo: "/topic/board/cursor/{boardId}" -> mọi "{...}" thành "{id}".
     *  2. Literal kết thúc bằng "/" và được nối chuỗi trên CÙNG dòng:
     *       "/topic/board/" + boardId + "/el"  -> "/topic/board/{id}/el"
     *       "/topic/board/" + boardId          -> "/topic/board/{id}"
     *     tức prefix + "{id}" + (literal hậu tố đứng ngay sau toán hạng nối, nếu có).
     *     Nối chuỗi xuống dòng hoặc nhiều hơn 1 toán hạng biến -> shape mang đuôi "?UNPARSED" và test fail,
     *     người thêm topic phải viết cùng dòng hoặc mở rộng CONCAT_TAIL.
     *  3. Shape không chứa "{id}" sau chuẩn hoá -> fail (topic không có board id thì không authorize được).
     * Comment / Javadoc không có dấu nháy kép nên không bị quét.
     */
    private static final Pattern TOPIC_LITERAL = Pattern.compile("\"(/topic/[^\"]*)\"");
    private static final Pattern CONCAT_TAIL =
            Pattern.compile("^\\s*\\+\\s*[A-Za-z_][\\w.()]*\\s*(?:\\+\\s*\"([^\"]*)\")?");
    private static final String SAMPLE_ID = "650000000000000000000001";
    private static final String SCAN_SELF_EXCLUDE = "BoardTopicAuthorizationInterceptor.java";

    static List<String> normaliseTopicLiterals(String line) {
        List<String> shapes = new ArrayList<>();
        Matcher m = TOPIC_LITERAL.matcher(line);
        while (m.find()) {
            String literal = m.group(1);
            if (literal.endsWith("/")) {
                Matcher tail = CONCAT_TAIL.matcher(line.substring(m.end()));
                if (!tail.find()) {
                    shapes.add(literal + "{id}?UNPARSED");
                } else {
                    shapes.add(literal + "{id}" + (tail.group(1) == null ? "" : tail.group(1)));
                }
            } else {
                shapes.add(literal.replaceAll("\\{[^}]+}", "{id}"));
            }
        }
        return shapes;
    }

    /** shape -> first "relative/file.java:line" it was seen at. */
    static Map<String, String> scanMainTopicShapes() throws IOException {
        Path root = Paths.get("src", "main", "java");
        if (!Files.isDirectory(root)) {
            root = Paths.get("IE213Backend", "src", "main", "java"); // chạy từ repo root (IDE)
        }
        assertTrue(Files.isDirectory(root), "main source root not found from cwd " + Paths.get("").toAbsolutePath());

        List<Path> javaFiles;
        try (Stream<Path> walk = Files.walk(root)) {
            javaFiles = walk.filter(p -> p.toString().endsWith(".java")).sorted().collect(Collectors.toList());
        }
        Map<String, String> shapes = new TreeMap<>();
        for (Path file : javaFiles) {
            if (file.getFileName().toString().equals(SCAN_SELF_EXCLUDE)) {
                continue;
            }
            List<String> lines = Files.readAllLines(file);
            for (int i = 0; i < lines.size(); i++) {
                for (String shape : normaliseTopicLiterals(lines.get(i))) {
                    shapes.putIfAbsent(shape, root.relativize(file) + ":" + (i + 1));
                }
            }
        }
        return shapes;
    }

    @Test
    void scan_normaliser_samples() {
        assertEquals(List.of("/topic/board/{id}/el"),
                normaliseTopicLiterals("        messagingTemplate.convertAndSend(\"/topic/board/\" + boardId + \"/el\", message);"));
        assertEquals(List.of("/topic/board/{id}"),
                normaliseTopicLiterals("                messagingTemplate.convertAndSend(\"/topic/board/\" + boardId, snapshot));"));
        assertEquals(List.of("/topic/board/cursor/{id}"),
                normaliseTopicLiterals("    @SendTo(\"/topic/board/cursor/{boardId}\")"));
        assertEquals(List.of("/topic/draw/board/{id}"),
                normaliseTopicLiterals("    @SendTo(\"/topic/draw/board/{boardId}\")"));
        assertEquals(List.of("/topic/board/{id}?UNPARSED"),
                normaliseTopicLiterals("        messagingTemplate.convertAndSend(\"/topic/board/\""));
        assertEquals(List.of(),
                normaliseTopicLiterals("// Realtime cho element thống nhất: mọi thay đổi phát trên /topic/board/{boardId}/el"));
    }

    @Test
    void scan_coversTheFourSpecShapes() throws IOException {
        Map<String, String> shapes = scanMainTopicShapes();
        assertTrue(shapes.size() >= 20, "expected >= 20 distinct board topic shapes on main, got " + shapes);
        assertTrue(shapes.containsKey("/topic/board/{id}"), shapes.toString());
        assertTrue(shapes.containsKey("/topic/board/{id}/el"), shapes.toString());
        assertTrue(shapes.containsKey("/topic/draw/board/{id}"), shapes.toString());
        for (String op : SPEC_OPS) {
            assertTrue(shapes.containsKey("/topic/board/" + op + "/{id}"), "missing op topic " + op + " in " + shapes);
        }
    }

    @Test
    void scan_everyMainTopicLiteralResolvesToItsBoardId() throws IOException {
        Map<String, String> shapes = scanMainTopicShapes();
        List<String> broken = new ArrayList<>();
        for (Map.Entry<String, String> entry : shapes.entrySet()) {
            String shape = entry.getKey();
            String resolved = shape.contains("{id}") ? extractBoardId(shape.replace("{id}", SAMPLE_ID)) : null;
            if (!SAMPLE_ID.equals(resolved)) {
                broken.add(shape + " @ " + entry.getValue() + " -> " + resolved);
            }
        }
        assertTrue(broken.isEmpty(),
                "topic shapes the interceptor would deny (add the shape to extractBoardId or BOARD_TOPIC_OPS): " + broken);
    }
    // ---- M1 OPS constant == spec §3 list (1) ----
    @Test
    void ops_constantMatchesSpecList() {
        assertEquals(17, SPEC_OPS.size());
        assertEquals(new HashSet<>(SPEC_OPS), BoardTopicAuthorizationInterceptor.BOARD_TOPIC_OPS);
    }

    // ---- helpers ----
    private Map<String, Object> sessionOf(String userId) {
        Map<String, Object> session = new HashMap<>();
        session.put("user", UserDto.builder().id(userId).build());
        return session;
    }

    @SuppressWarnings("unchecked")
    private Set<String> authorizedBoards(Map<String, Object> session) {
        Object cache = session.get(BoardTopicAuthorizationInterceptor.AUTHORIZED_BOARDS_ATTR);
        return cache == null ? Set.of() : (Set<String>) cache;
    }

    private Message<byte[]> subscribeMessage(String destination, Map<String, Object> sessionAttributes) {
        return stompMessage(StompCommand.SUBSCRIBE, destination, sessionAttributes);
    }

    private Message<byte[]> sendMessage(String destination, Map<String, Object> sessionAttributes) {
        return stompMessage(StompCommand.SEND, destination, sessionAttributes);
    }

    private Message<byte[]> stompMessage(StompCommand command, String destination, Map<String, Object> sessionAttributes) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        accessor.setSessionAttributes(sessionAttributes);
        accessor.setSessionId("session-1");
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private MessageChannel mockChannel() {
        return new MessageChannel() {
            @Override public boolean send(Message<?> message) { return true; }
            @Override public boolean send(Message<?> message, long timeout) { return true; }
        };
    }

    /** Delegates to the real fail-closed canAccess while counting invocations (AC-5 zero-lookup proof). */
    private static class CountingBoardAccessService extends BoardAccessService {
        private int canAccessCalls = 0;

        CountingBoardAccessService(BoardRepository boardRepository, CanvaPathRepository canvaPathRepository) {
            super(boardRepository, canvaPathRepository);
        }

        @Override
        public boolean canAccess(String boardId, String userId) {
            canAccessCalls++;
            return super.canAccess(boardId, userId);
        }
    }

    /** Hand-rolled in-memory fake of BoardRepository (no Mockito); only findById is meaningfully implemented. */
    private static class FakeBoardRepository implements BoardRepository {
        private final Map<String, Board> store = new HashMap<>();

        void seed(Board board) { store.put(board.getId(), board); }

        @Override public Optional<Board> findById(String id) { return Optional.ofNullable(store.get(id)); }
        @Override public Board findByid(String id) { return store.get(id); }
        @Override public List<Board> findByOwnerOrMembersMemberId(String userId) { return new ArrayList<>(); }
        @Override public Optional<Board> findUserRoleInBoard(String boardId, String userId) { return Optional.empty(); }
        @Override public long countByOwner(String owner) { return 0; }

        // --- Unused MongoRepository plumbing (not exercised by these tests) ---
        @Override public <S extends Board> S save(S entity) { store.put(entity.getId(), entity); return entity; }
        @Override public <S extends Board> List<S> saveAll(Iterable<S> entities) { throw new UnsupportedOperationException(); }
        @Override public Optional<Board> findById(org.bson.types.ObjectId objectId) { throw new UnsupportedOperationException(); }
        @Override public boolean existsById(org.bson.types.ObjectId objectId) { throw new UnsupportedOperationException(); }
        @Override public List<Board> findAll() { return new ArrayList<>(store.values()); }
        @Override public List<Board> findAllById(Iterable<org.bson.types.ObjectId> objectIds) { throw new UnsupportedOperationException(); }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(org.bson.types.ObjectId objectId) { throw new UnsupportedOperationException(); }
        @Override public void delete(Board entity) { store.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends org.bson.types.ObjectId> objectIds) { throw new UnsupportedOperationException(); }
        @Override public void deleteAll(Iterable<? extends Board> entities) { throw new UnsupportedOperationException(); }
        @Override public void deleteAll() { store.clear(); }
        @Override public List<Board> findAll(Sort sort) { throw new UnsupportedOperationException(); }
        @Override public org.springframework.data.domain.Page<Board> findAll(org.springframework.data.domain.Pageable pageable) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board> S insert(S entity) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board> List<S> insert(Iterable<S> entities) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board> Optional<S> findOne(Example<S> example) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board> List<S> findAll(Example<S> example) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board> List<S> findAll(Example<S> example, Sort sort) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board> org.springframework.data.domain.Page<S> findAll(Example<S> example, org.springframework.data.domain.Pageable pageable) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board> long count(Example<S> example) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board> boolean exists(Example<S> example) { throw new UnsupportedOperationException(); }
        @Override public <S extends Board, R> R findBy(Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { throw new UnsupportedOperationException(); }
    }

    /** Hand-rolled in-memory fake of CanvaPathRepository (no Mockito); never exercised, satisfies the constructor only. */
    private static class FakeCanvaPathRepository implements CanvaPathRepository {
        private final Map<String, CanvasPath> store = new HashMap<>();

        @Override public <S extends CanvasPath> S save(S entity) { store.put(entity.getId(), entity); return entity; }
        @Override public <S extends CanvasPath> List<S> saveAll(Iterable<S> entities) { throw new UnsupportedOperationException(); }
        @Override public Optional<CanvasPath> findById(String id) { return Optional.ofNullable(store.get(id)); }
        @Override public boolean existsById(String s) { return store.containsKey(s); }
        @Override public List<CanvasPath> findAll() { return new ArrayList<>(store.values()); }
        @Override public List<CanvasPath> findAllById(Iterable<String> strings) { throw new UnsupportedOperationException(); }
        @Override public long count() { return store.size(); }
        @Override public void deleteById(String s) { store.remove(s); }
        @Override public void delete(CanvasPath entity) { store.remove(entity.getId()); }
        @Override public void deleteAllById(Iterable<? extends String> strings) { throw new UnsupportedOperationException(); }
        @Override public void deleteAll(Iterable<? extends CanvasPath> entities) { throw new UnsupportedOperationException(); }
        @Override public void deleteAll() { store.clear(); }
        @Override public List<CanvasPath> findAll(Sort sort) { throw new UnsupportedOperationException(); }
        @Override public org.springframework.data.domain.Page<CanvasPath> findAll(org.springframework.data.domain.Pageable pageable) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath> S insert(S entity) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath> List<S> insert(Iterable<S> entities) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath> Optional<S> findOne(Example<S> example) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath> List<S> findAll(Example<S> example) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath> List<S> findAll(Example<S> example, Sort sort) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath> org.springframework.data.domain.Page<S> findAll(Example<S> example, org.springframework.data.domain.Pageable pageable) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath> long count(Example<S> example) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath> boolean exists(Example<S> example) { throw new UnsupportedOperationException(); }
        @Override public <S extends CanvasPath, R> R findBy(Example<S> example, java.util.function.Function<org.springframework.data.repository.query.FluentQuery.FetchableFluentQuery<S>, R> queryFunction) { throw new UnsupportedOperationException(); }
    }
}
