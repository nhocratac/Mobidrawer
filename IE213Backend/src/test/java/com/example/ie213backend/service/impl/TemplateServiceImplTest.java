package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.domain.model.Template;
import com.example.ie213backend.repository.TemplateRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.CanvasPathService;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.Intent;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TemplateServiceImplTest {
    @Mock
    TemplateRepository templateRepository;
    @Mock
    BoardService boardService;
    @Mock
    CanvasPathService canvasPathService;
    @Mock
    ElementWriter elementWriter;
    @InjectMocks
    TemplateServiceImpl service;

    private static final String BOARD = "650000000000000000000009";

    private Board created() {
        Board b = new Board();
        b.setId(BOARD);
        return b;
    }

    @Test
    void usingTemplateCommitsElementsThroughWriterAsTemplateSource() {
        when(boardService.createBoard(any(Board.class), eq("owner1"))).thenReturn(created());
        when(elementWriter.commit(any())).thenReturn(ElementWriter.CommitResult.EMPTY);
        BoardElement sticky = new BoardElement();
        sticky.setId("t1");
        sticky.setType("sticky");
        sticky.setW(200);
        sticky.setH(200);
        Template template = new Template();
        template.setTitle("T");
        template.setElements(List.of(sticky));

        assertEquals(BOARD, service.usingTemplate(template, "owner1").getId());

        ArgumentCaptor<ElementWriter.CommitRequest> captor = ArgumentCaptor.forClass(ElementWriter.CommitRequest.class);
        verify(elementWriter).commit(captor.capture());
        ElementWriter.CommitRequest req = captor.getValue();
        assertEquals(BOARD, req.boardId());
        assertEquals("owner1", req.userId());
        assertNull(req.sessionId());
        assertEquals("template", req.source());
        assertNull(req.mergeKey());
        assertNull(req.target());
        assertEquals(1, req.intents().size());
        Intent intent = req.intents().get(0);
        assertEquals("create", intent.kind());
        assertNotEquals("t1", intent.elementId());
        assertEquals(BOARD, intent.element().get("boardId"));
        assertEquals("owner1", intent.element().get("owner"));
        verifyNoInteractions(canvasPathService);
    }

    @Test
    void usingEmptyTemplateDoesNotTouchWriter() {
        when(boardService.createBoard(any(Board.class), eq("owner1"))).thenReturn(created());
        service.usingTemplate(new Template(), "owner1");
        verifyNoInteractions(elementWriter);
    }
}
