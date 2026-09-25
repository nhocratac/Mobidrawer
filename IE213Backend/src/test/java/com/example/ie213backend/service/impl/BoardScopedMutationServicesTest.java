package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateCanvasPath;
import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateMultipleCanvasPaths;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.domain.model.Image;
import com.example.ie213backend.domain.model.StickyNote;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.CanvaPathRepository;
import com.example.ie213backend.repository.ImageRepository;
import com.example.ie213backend.repository.StickyNoteRepository;
import com.example.ie213backend.service.BoardService;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

/**
 * Pure-JVM unit tests: every sticky-note / image / canvas-path mutation is
 * scoped by _id AND boardId, so an object id belonging to another board
 * matches nothing (no cross-board edit/delete, no cross-board data echoed).
 */
class BoardScopedMutationServicesTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) needs forward-compatible mode on Java 25.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private static final String BOARD_ID = "board-A";
    private static final String USER_ID = "editor-1";

    private MongoTemplate mongoTemplate;
    private BoardService boardService;

    @BeforeEach
    void setUp() {
        mongoTemplate = Mockito.mock(MongoTemplate.class);
        boardService = Mockito.mock(BoardService.class);
        Mockito.when(boardService.getRoleOfMember(BOARD_ID, USER_ID)).thenReturn("EDITOR");
    }

    private static void assertScopedToBoard(Query query, String id) {
        Document q = query.getQueryObject();
        assertEquals(id, q.get("_id"));
        assertEquals(BOARD_ID, q.get("boardId"));
    }

    // ---- StickyNote ----

    private StickyNoteServiceImpl stickyNoteService(StickyNoteRepository repo) {
        return new StickyNoteServiceImpl(repo, Mockito.mock(BoardRepository.class), mongoTemplate, boardService);
    }

    @Test
    void stickyNote_move_queryScopedByBoard() {
        StickyNote updated = new StickyNote();
        Mockito.when(mongoTemplate.findAndModify(any(Query.class), any(Update.class),
                any(FindAndModifyOptions.class), eq(StickyNote.class))).thenReturn(updated);

        StickyNote result = stickyNoteService(Mockito.mock(StickyNoteRepository.class))
                .updateStickyNotePosition("n1", BOARD_ID, USER_ID, 10, 20);

        assertSame(updated, result);
        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        Mockito.verify(mongoTemplate).findAndModify(captor.capture(), any(Update.class),
                any(FindAndModifyOptions.class), eq(StickyNote.class));
        assertScopedToBoard(captor.getValue(), "n1");
    }

    @Test
    void stickyNote_resizeAndChangeText_queriesScopedByBoard() {
        Mockito.when(mongoTemplate.findAndModify(any(Query.class), any(Update.class),
                any(FindAndModifyOptions.class), eq(StickyNote.class))).thenReturn(new StickyNote());
        StickyNote input = new StickyNote();
        input.setId("n1");
        input.setBoardId(BOARD_ID);
        StickyNoteServiceImpl service = stickyNoteService(Mockito.mock(StickyNoteRepository.class));

        service.updateStickyNoteSize(input);
        service.chaneTextStickyNote(input);

        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        Mockito.verify(mongoTemplate, Mockito.times(2)).findAndModify(captor.capture(), any(Update.class),
                any(FindAndModifyOptions.class), eq(StickyNote.class));
        captor.getAllValues().forEach(q -> assertScopedToBoard(q, "n1"));
    }

    @Test
    void stickyNote_moveForeignId_notFound404() {
        // findAndModify matches nothing (id belongs to another board) -> null
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> stickyNoteService(Mockito.mock(StickyNoteRepository.class))
                        .updateStickyNotePosition("foreign", BOARD_ID, USER_ID, 1, 2));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void stickyNote_delete_scopedByBoard() {
        StickyNoteRepository repo = Mockito.mock(StickyNoteRepository.class);

        stickyNoteService(repo).deleteStickyNote("n1", BOARD_ID, USER_ID);

        Mockito.verify(repo).deleteByIdAndBoardId("n1", BOARD_ID);
        Mockito.verify(repo, Mockito.never()).deleteById(anyString());
    }

    // ---- Image ----

    private ImageServiceImpl imageService(ImageRepository repo) {
        return new ImageServiceImpl(repo, Mockito.mock(BoardRepository.class), mongoTemplate, boardService);
    }

    @Test
    void image_moveAndResize_queriesScopedByBoard() {
        Mockito.when(mongoTemplate.findAndModify(any(Query.class), any(Update.class),
                any(FindAndModifyOptions.class), eq(Image.class))).thenReturn(new Image());
        Image input = new Image();
        input.setId("img1");
        input.setBoardId(BOARD_ID);
        ImageServiceImpl service = imageService(Mockito.mock(ImageRepository.class));

        service.updateImagePosition(input);
        service.updateImageSize(input);

        ArgumentCaptor<Query> captor = ArgumentCaptor.forClass(Query.class);
        Mockito.verify(mongoTemplate, Mockito.times(2)).findAndModify(captor.capture(), any(Update.class),
                any(FindAndModifyOptions.class), eq(Image.class));
        captor.getAllValues().forEach(q -> assertScopedToBoard(q, "img1"));
    }

    @Test
    void image_moveForeignId_notFound404() {
        Image input = new Image();
        input.setId("foreign");
        input.setBoardId(BOARD_ID);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> imageService(Mockito.mock(ImageRepository.class)).updateImagePosition(input));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void image_delete_scopedByBoard() {
        ImageRepository repo = Mockito.mock(ImageRepository.class);

        imageService(repo).deleteImage("img1", BOARD_ID, USER_ID);

        Mockito.verify(repo).deleteByIdAndBoardId("img1", BOARD_ID);
        Mockito.verify(repo, Mockito.never()).deleteById(anyString());
    }

    // ---- CanvasPath ----

    private CanvasPathServiceImpl canvasPathService(CanvaPathRepository repo) {
        return new CanvasPathServiceImpl(repo, Mockito.mock(BoardRepository.class), boardService);
    }

    @Test
    void canvasPath_delete_scopedByBoard() {
        CanvaPathRepository repo = Mockito.mock(CanvaPathRepository.class);

        canvasPathService(repo).deleteCanvas("p1", BOARD_ID, USER_ID);

        Mockito.verify(repo).deleteByIdAndBoardId("p1", BOARD_ID);
        Mockito.verify(repo, Mockito.never()).deleteById(anyString());
    }

    @Test
    void canvasPath_updateForeignId_notFound404_nothingSaved() {
        CanvaPathRepository repo = Mockito.mock(CanvaPathRepository.class);
        Mockito.when(repo.findByIdAndBoardId("foreign", BOARD_ID)).thenReturn(Optional.empty());
        UpdateCanvasPath path = new UpdateCanvasPath();
        path.setId("foreign");
        path.setPaths(List.of(new UpdateCanvasPath.CoordinateDto(1, 2)));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> canvasPathService(repo).updateMultipleCanvasPaths(
                        new UpdateMultipleCanvasPaths(List.of(path)), BOARD_ID, USER_ID));

        assertEquals(404, ex.getStatusCode().value());
        Mockito.verify(repo, Mockito.never()).findById(anyString());
        Mockito.verify(repo, Mockito.never()).save(any());
    }

    @Test
    void canvasPath_updateOwnBoardPath_saved() {
        CanvaPathRepository repo = Mockito.mock(CanvaPathRepository.class);
        CanvasPath existing = new CanvasPath();
        existing.setId("p1");
        existing.setBoardId(BOARD_ID);
        Mockito.when(repo.findByIdAndBoardId("p1", BOARD_ID)).thenReturn(Optional.of(existing));
        Mockito.when(repo.save(existing)).thenReturn(existing);
        UpdateCanvasPath path = new UpdateCanvasPath();
        path.setId("p1");
        path.setColor("#000000");
        path.setPaths(List.of(new UpdateCanvasPath.CoordinateDto(1, 2)));

        List<CanvasPath> result = canvasPathService(repo).updateMultipleCanvasPaths(
                new UpdateMultipleCanvasPaths(List.of(path)), BOARD_ID, USER_ID);

        assertEquals(List.of(existing), result);
        assertEquals("#000000", existing.getColor());
    }
}
