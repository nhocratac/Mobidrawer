package com.example.ie213backend.service.impl;

import com.example.ie213backend.configstore.ConfigCache;
import com.example.ie213backend.configstore.ConfigKey;
import com.example.ie213backend.configstore.ConfigService;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.BoardCustomRepository;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure-JVM unit tests for BUG 2 (save-before-notify ordering, best-effort
 * notify) and BUG 3a (business-rule violations -> ResponseStatusException
 * 403/409) in BoardServiceImpl. Hand-rolled JDK-Proxy stubs for the Mongo
 * repository interfaces, a hand-rolled NotificationService fake, and a
 * ConfigService subclass. No Mockito, no Spring context.
 */
class SecHardeningBoardMemberTest {

    private static final String OWNER_ID = "owner-1";
    private static final String OTHER_ID = "someone-else";
    private static final String BOARD_ID = "board-1";
    private static final String NEW_MEMBER_EMAIL = "new-member@example.com";
    private static final String NEW_MEMBER_ID = "new-member-1";
    private static final String EXISTING_MEMBER_ID = "existing-member-1";

    private List<String> callOrder;
    private List<Board> savedBoards;
    private Board board;
    private User owner;
    private User newMember;

    @BeforeEach
    void setUp() {
        callOrder = new ArrayList<>();
        savedBoards = new ArrayList<>();

        board = new Board();
        board.setId(BOARD_ID);
        board.setOwner(OWNER_ID);
        board.setMembers(new ArrayList<>());
        board.getMembers().add(new Board.Member(EXISTING_MEMBER_ID, Board.ROLE.VIEWER));

        owner = new User();
        owner.setId(OWNER_ID);

        newMember = new User();
        newMember.setId(NEW_MEMBER_ID);
        newMember.setEmail(NEW_MEMBER_EMAIL);
    }

    private BoardServiceImpl newService(NotificationService notificationService) {
        BoardRepository boardRepository = proxyRepository(BoardRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> {
                    String id = (String) args[0];
                    return BOARD_ID.equals(id) ? Optional.of(board) : Optional.empty();
                },
                "save", (Function<Object[], Object>) args -> {
                    callOrder.add("save");
                    Board saved = (Board) args[0];
                    savedBoards.add(saved);
                    return saved;
                }
        ));

        UserRepository userRepository = proxyRepository(UserRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> {
                    String id = (String) args[0];
                    if (OWNER_ID.equals(id)) {
                        return Optional.of(owner);
                    }
                    User requester = new User();
                    requester.setId(id);
                    return Optional.of(requester);
                },
                "findByEmail", (Function<Object[], Object>) args -> {
                    String email = (String) args[0];
                    return NEW_MEMBER_EMAIL.equals(email) ? Optional.of(newMember) : Optional.empty();
                }
        ));

        ConfigService configService = new ConfigService(new ConfigCache(null)) {
            @Override
            public int getInt(ConfigKey<Integer> key) {
                return 100;
            }
        };

        return new BoardServiceImpl(boardRepository, userRepository, new BoardCustomRepository(), null, notificationService, configService);
    }

    @Test
    void addMember_savePersistsEvenWhenNotifyThrows() {
        NotificationService throwingNotifier = new RecordingNotificationService(callOrder, true);
        BoardServiceImpl service = newService(throwingNotifier);

        Board result = assertDoesNotThrow(() ->
                service.addMemberToBoard(BOARD_ID, NEW_MEMBER_EMAIL, Board.ROLE.EDITOR, OWNER_ID));

        assertTrue(callOrder.contains("save"), "save must have been invoked even though notify threw");
        assertEquals(1, savedBoards.size());
        assertEquals(BOARD_ID, result.getId());
        assertTrue(result.getMembers().stream().anyMatch(m -> m.getMemberId().equals(NEW_MEMBER_ID)),
                "membership must be persisted in the returned/saved board");
    }

    @Test
    void addMember_successPath_saveHappensStrictlyBeforeNotify() {
        NotificationService okNotifier = new RecordingNotificationService(callOrder, false);
        BoardServiceImpl service = newService(okNotifier);

        Board result = service.addMemberToBoard(BOARD_ID, NEW_MEMBER_EMAIL, Board.ROLE.EDITOR, OWNER_ID);

        assertEquals(List.of("save", "notify"), callOrder, "save must be recorded strictly before notify");
        assertEquals(BOARD_ID, result.getId());
    }

    @Test
    void addMember_notOwner_throws403() {
        NotificationService notifier = new RecordingNotificationService(callOrder, false);
        BoardServiceImpl service = newService(notifier);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.addMemberToBoard(BOARD_ID, NEW_MEMBER_EMAIL, Board.ROLE.EDITOR, OTHER_ID));

        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void addMember_alreadyJoined_throws409() {
        NotificationService notifier = new RecordingNotificationService(callOrder, false);
        BoardServiceImpl service = newService(notifier);

        User existingMember = new User();
        existingMember.setId(EXISTING_MEMBER_ID);
        existingMember.setEmail("existing@example.com");

        BoardRepository boardRepository = proxyRepository(BoardRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> Optional.of(board)
        ));
        UserRepository userRepository = proxyRepository(UserRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> Optional.of(owner),
                "findByEmail", (Function<Object[], Object>) args -> Optional.of(existingMember)
        ));
        ConfigService configService = new ConfigService(new ConfigCache(null)) {
            @Override
            public int getInt(ConfigKey<Integer> key) {
                return 100;
            }
        };
        BoardServiceImpl serviceWithExistingMember = new BoardServiceImpl(
                boardRepository, userRepository, new BoardCustomRepository(), null, notifier, configService);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                serviceWithExistingMember.addMemberToBoard(BOARD_ID, "existing@example.com", Board.ROLE.EDITOR, OWNER_ID));

        assertEquals(409, ex.getStatusCode().value());
    }

    @Test
    void changeRole_notOwner_throws403() {
        NotificationService notifier = new RecordingNotificationService(callOrder, false);
        BoardServiceImpl service = newService(notifier);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                service.changeRoleOfMember(BOARD_ID, EXISTING_MEMBER_ID, Board.ROLE.EDITOR, OTHER_ID));

        assertEquals(403, ex.getStatusCode().value());
    }

    /**
     * Hand-rolled NotificationService fake (no Mockito) recording the notify
     * call into the shared call-order list, optionally throwing to simulate
     * an SMTP failure.
     */
    private static class RecordingNotificationService implements NotificationService {
        private final List<String> callOrder;
        private final boolean shouldThrow;

        RecordingNotificationService(List<String> callOrder, boolean shouldThrow) {
            this.callOrder = callOrder;
            this.shouldThrow = shouldThrow;
        }

        @Override
        public com.example.ie213backend.domain.model.Notification sendRequestJoinBoard(String userId, String boardId) {
            throw new UnsupportedOperationException("not stubbed");
        }

        @Override
        public List<com.example.ie213backend.domain.model.Notification> getNotifications(String userId) {
            throw new UnsupportedOperationException("not stubbed");
        }

        @Override
        public void joinBoardSuccessful(String ownerId, Board board, User user) {
            callOrder.add("notify");
            if (shouldThrow) {
                throw new RuntimeException("simulated SMTP outage");
            }
        }

        @Override
        public void sendNotification(String title, String content, List<String> receivers) {
            throw new UnsupportedOperationException("not stubbed");
        }

        @Override
        public List<com.example.ie213backend.domain.model.Notification> markNotificationAsRead(String userId, List<String> notificationIds) {
            throw new UnsupportedOperationException("not stubbed");
        }
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxyRepository(Class<T> iface, Map<String, Function<Object[], Object>> behaviors) {
        Map<String, Function<Object[], Object>> handlers = new HashMap<>(behaviors);
        return (T) Proxy.newProxyInstance(
                iface.getClassLoader(),
                new Class<?>[]{iface},
                (proxy, method, args) -> {
                    Function<Object[], Object> behavior = handlers.get(method.getName());
                    if (behavior != null) {
                        return behavior.apply(args == null ? new Object[0] : args);
                    }
                    switch (method.getName()) {
                        case "hashCode":
                            return System.identityHashCode(proxy);
                        case "equals":
                            return proxy == args[0];
                        case "toString":
                            return iface.getSimpleName() + "Proxy";
                        default:
                            throw new UnsupportedOperationException("Unstubbed method: " + method.getName());
                    }
                });
    }
}
