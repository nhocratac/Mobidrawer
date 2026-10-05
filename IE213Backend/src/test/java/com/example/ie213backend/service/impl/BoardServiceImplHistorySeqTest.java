package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.BoardDto.BoardFullDetailResponse;
import com.example.ie213backend.repository.BoardCustomRepository;
import com.example.ie213backend.repository.BoardElementRepository;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.TemplateService;
import com.example.ie213backend.service.element.BoardElementService;
import com.example.ie213backend.service.history.BoardLocks;
import com.example.ie213backend.service.history.ElementWriter;
import com.example.ie213backend.service.history.StompBatchPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardServiceImplHistorySeqTest {
    @Mock
    BoardCustomRepository boardCustomRepository;
    @Mock
    BoardElementRepository boardElementRepository;
    @Mock
    ElementWriter elementWriter;
    @InjectMocks
    BoardServiceImpl service;

    @Test
    void getBoardReadsHistorySeqBeforeElements() {
        BoardFullDetailResponse board = new BoardFullDetailResponse();
        board.setOwner("u");
        when(boardCustomRepository.getBoardWithCanvasPaths("b")).thenReturn(board);
        when(elementWriter.committedSeq("b")).thenReturn(42L);
        when(boardElementRepository.findByBoardIdOrderByZAsc("b")).thenReturn(List.of());

        BoardFullDetailResponse out = service.getBoard("b", "u");

        assertEquals(42L, out.getHistorySeq());
        // đọc seq trước elements: elements luôn mới bằng hoặc hơn historySeq (§9.2)
        InOrder order = inOrder(elementWriter, boardElementRepository);
        order.verify(elementWriter).committedSeq("b");
        order.verify(boardElementRepository).findByBoardIdOrderByZAsc("b");
    }

    @Test
    void elementWriterDependencyGraphNeverReachesBoardServices() {
        // BoardServiceImpl -> ElementWriter: writer mà phụ thuộc ngược BoardService thì Spring báo vòng
        List<Class<?>> forbidden = List.of(BoardService.class, BoardElementService.class, TemplateService.class);
        Set<Class<?>> seen = new HashSet<>();
        Deque<Class<?>> todo = new ArrayDeque<>(List.of(ElementWriter.class, StompBatchPublisher.class, BoardLocks.class));
        while (!todo.isEmpty()) {
            Class<?> c = todo.pop();
            if (!seen.add(c)) continue;
            for (Class<?> f : forbidden)
                assertFalse(f.isAssignableFrom(c), c.getName() + " phụ thuộc " + f.getSimpleName());
            for (Constructor<?> k : c.getDeclaredConstructors())
                for (Class<?> p : k.getParameterTypes())
                    if (p.getName().startsWith("com.example.ie213backend")) todo.push(p);
            for (Field f : c.getDeclaredFields())
                if (f.getType().getName().startsWith("com.example.ie213backend")) todo.push(f.getType());
        }
    }
}
