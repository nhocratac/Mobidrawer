package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.BoardDto.BoardFullDetailResponse;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.repository.BoardCustomRepository;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pure-JVM unit tests (no @SpringBootTest, no live Mongo, no Mockito) proving
 * the two former RuntimeException(->500) throw sites in BoardServiceImpl are
 * now converted to the correct status-mapping ResponseStatusException:
 *
 * (b) getBoard(boardId, strangerId) -> 403 (access-denied), stubbing
 *     BoardCustomRepository.getBoardWithCanvasPaths(id) directly (a subclass
 *     override, NOT findById) to return a non-null BoardFullDetailResponse
 *     whose owner != stranger and whose members list excludes the stranger.
 * (c) changeRoleOfMember(missingBoardId, ...) -> 404 (board-not-found),
 *     stubbing BoardRepository.findById via a hand-rolled JDK-Proxy fake
 *     (SecHardeningBoardMemberTest precedent) to return Optional.empty().
 */
class NotFoundNormalizationBoardServiceImplTest {

    private static final String OWNER_ID = "owner-1";
    private static final String STRANGER_ID = "stranger-1";
    private static final String BOARD_ID = "board-1";

    @Test
    void getBoard_strangerExcludedFromMembers_throws403() {
        BoardCustomRepository fakeCustomRepository = new BoardCustomRepository() {
            @Override
            public BoardFullDetailResponse getBoardWithCanvasPaths(String id) {
                BoardFullDetailResponse response = new BoardFullDetailResponse();
                response.setId(BOARD_ID);
                response.setOwner(OWNER_ID);
                List<Board.Member> members = new ArrayList<>();
                members.add(new Board.Member("some-other-member", Board.ROLE.EDITOR));
                response.setMembers(members);
                return response;
            }
        };

        BoardServiceImpl service = new BoardServiceImpl(
                proxyRepository(BoardRepository.class, Map.of()),
                proxyRepository(UserRepository.class, Map.of()),
                fakeCustomRepository,
                null,
                null,
                null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.getBoard(BOARD_ID, STRANGER_ID));

        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void changeRoleOfMember_missingBoard_throws404() {
        BoardRepository boardRepository = proxyRepository(BoardRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> Optional.empty()
        ));

        BoardServiceImpl service = new BoardServiceImpl(
                boardRepository,
                proxyRepository(UserRepository.class, Map.of()),
                new BoardCustomRepository(),
                null,
                null,
                null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.changeRoleOfMember("no-such-board", "member-1", Board.ROLE.EDITOR, OWNER_ID));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxyRepository(Class<T> iface, Map<String, Function<Object[], Object>> behaviors) {
        return (T) Proxy.newProxyInstance(
                iface.getClassLoader(),
                new Class<?>[]{iface},
                (proxy, method, args) -> {
                    Function<Object[], Object> behavior = behaviors.get(method.getName());
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
