package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.BoardTx;
import com.example.ie213backend.service.history.HistoryService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class HistoryControllerTest {
    HistoryService service = mock(HistoryService.class);
    HistoryController controller = new HistoryController(service);
    UserDto user = UserDto.builder().id("u1").build();

    @Test
    void listUsesTheRequestUserAndMapsUnderBoardPrefix() throws Exception {
        List<HistoryService.TxView> views = List.of(new HistoryService.TxView("t1", "u1", "An Nguyen",
                Instant.EPOCH, "user", "active", new BoardTx.Summary(1, 0, 0), 3));
        when(service.list("b", "u1", 10L, 30)).thenReturn(views);

        ResponseEntity<List<HistoryService.TxView>> res = controller.getHistory("b", 10L, 30, user);

        assertEquals(200, res.getStatusCode().value());
        assertSame(views, res.getBody());
        assertArrayEquals(new String[]{"${api.prefix}/board"}, HistoryController.class.getAnnotation(RequestMapping.class).value());
        assertArrayEquals(new String[]{"/{id}/history"}, HistoryController.class
                .getMethod("getHistory", String.class, Long.class, int.class, UserDto.class)
                .getAnnotation(GetMapping.class).value());
    }

    @Test
    void stateUsesTheRequestUser() throws Exception {
        HistoryService.StateView view = new HistoryService.StateView(5, List.of());
        when(service.stateAt("b", "u1", 5)).thenReturn(view);

        assertSame(view, controller.getStateAt("b", 5, user).getBody());
        assertArrayEquals(new String[]{"/{id}/history/state"}, HistoryController.class
                .getMethod("getStateAt", String.class, long.class, UserDto.class)
                .getAnnotation(GetMapping.class).value());
    }
}
