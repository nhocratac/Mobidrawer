package com.example.ie213backend.security;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.CanvaPathRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Example;
import org.springframework.data.domain.Sort;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pure-JVM unit tests for BoardAccessService: hand-rolled fake repositories,
 * no Mockito, no Spring context. Covers the 8 required cases from the sprint contract.
 */
class BoardAccessServiceTest {

    private static final String OWNER_ID = "owner-1";
    private static final String EDITOR_ID = "editor-1";
    private static final String VIEWER_ID = "viewer-1";
    private static final String STRANGER_ID = "stranger-1";
    private static final String BOARD_ID = "board-1";
    private static final String CANVAS_ID = "canvas-1";

    private FakeBoardRepository boardRepository;
    private FakeCanvaPathRepository canvaPathRepository;
    private BoardAccessService guard;

    @BeforeEach
    void setUp() {
        boardRepository = new FakeBoardRepository();
        canvaPathRepository = new FakeCanvaPathRepository();
        guard = new BoardAccessService(boardRepository, canvaPathRepository);

        Board board = new Board();
        board.setId(BOARD_ID);
        board.setOwner(OWNER_ID);
        List<Board.Member> members = new ArrayList<>();
        members.add(new Board.Member(EDITOR_ID, Board.ROLE.EDITOR));
        members.add(new Board.Member(VIEWER_ID, Board.ROLE.VIEWER));
        board.setMembers(members);
        boardRepository.seed(board);

        CanvasPath canvasPath = new CanvasPath();
        canvasPath.setId(CANVAS_ID);
        canvasPath.setBoardId(BOARD_ID);
        canvaPathRepository.seed(canvasPath);
    }

    @Test
    void allowOwner() {
        assertDoesNotThrowAllow(() -> guard.assertCanWrite(BOARD_ID, OWNER_ID));
    }

    @Test
    void allowMemberEditor() {
        assertDoesNotThrowAllow(() -> guard.assertCanWrite(BOARD_ID, EDITOR_ID));
    }

    @Test
    void allowMemberViewer() {
        assertDoesNotThrowAllow(() -> guard.assertCanWrite(BOARD_ID, VIEWER_ID));
    }

    @Test
    void denyNonMember() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> guard.assertCanWrite(BOARD_ID, STRANGER_ID));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void denyNullUserId() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> guard.assertCanWrite(BOARD_ID, null));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void denyNullUserIdEvenWithOwnerlessBoard() {
        Board ownerless = new Board();
        ownerless.setId("board-ownerless");
        ownerless.setOwner(null);
        ownerless.setMembers(new ArrayList<>());
        boardRepository.seed(ownerless);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> guard.assertCanWrite("board-ownerless", null));
        assertEquals(403, ex.getStatusCode().value());
    }

    @Test
    void boardMissing404() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> guard.assertCanWrite("no-such-board", OWNER_ID));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void resolverCanvasMissing404() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> guard.assertCanWriteToCanvasPath("no-such-canvas", OWNER_ID));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void resolverDelegatesToEntityResolvedBoardId() {
        // A member of the canvas's TRUE board (BOARD_ID) is allowed.
        assertDoesNotThrowAllow(() -> guard.assertCanWriteToCanvasPath(CANVAS_ID, EDITOR_ID));

        // A non-member of the canvas's TRUE board is denied 403, even though they
        // are not passing any caller-supplied boardId at all — proving the resolver
        // keys authorization on the entity-resolved boardId, not any caller-supplied one.
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> guard.assertCanWriteToCanvasPath(CANVAS_ID, STRANGER_ID));
        assertEquals(403, ex.getStatusCode().value());
    }

    private void assertDoesNotThrowAllow(Runnable action) {
        try {
            action.run();
        } catch (ResponseStatusException e) {
            throw new AssertionError("Expected allow, but was denied with status " + e.getStatusCode(), e);
        }
    }

    /**
     * Hand-rolled in-memory fake of BoardRepository (no Mockito). Only the methods
     * BoardAccessService actually calls (findById) are meaningfully implemented;
     * the rest are trivial stubs required to satisfy the MongoRepository interface.
     */
    private static class FakeBoardRepository implements BoardRepository {
        private final Map<String, Board> store = new HashMap<>();

        void seed(Board board) {
            store.put(board.getId(), board);
        }

        @Override
        public Optional<Board> findById(String id) {
            return Optional.ofNullable(store.get(id));
        }

        @Override
        public Board findByid(String id) {
            return store.get(id);
        }

        @Override
        public List<Board> findByOwnerOrMembersMemberId(String userId) {
            return new ArrayList<>();
        }

        @Override
        public Optional<Board> findUserRoleInBoard(String boardId, String userId) {
            return Optional.empty();
        }

        @Override
        public long countByOwner(String owner) {
            return 0;
        }

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

    /**
     * Hand-rolled in-memory fake of CanvaPathRepository (no Mockito).
     */
    private static class FakeCanvaPathRepository implements CanvaPathRepository {
        private final Map<String, CanvasPath> store = new HashMap<>();

        void seed(CanvasPath canvasPath) {
            store.put(canvasPath.getId(), canvasPath);
        }

        @Override
        public Optional<CanvasPath> findById(String id) {
            return Optional.ofNullable(store.get(id));
        }

        // --- Unused MongoRepository plumbing (not exercised by these tests) ---
        @Override public <S extends CanvasPath> S save(S entity) { store.put(entity.getId(), entity); return entity; }
        @Override public <S extends CanvasPath> List<S> saveAll(Iterable<S> entities) { throw new UnsupportedOperationException(); }
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
