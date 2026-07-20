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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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
