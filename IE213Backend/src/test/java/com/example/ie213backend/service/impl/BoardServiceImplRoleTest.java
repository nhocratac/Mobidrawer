package com.example.ie213backend.service.impl;

import com.example.ie213backend.repository.BoardRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardServiceImplRoleTest {
    @Mock
    BoardRepository boardRepository;
    @InjectMocks
    BoardServiceImpl service;

    @Test
    void missingBoardIsNotFoundInsteadOfNpe() {
        when(boardRepository.findByid("missing")).thenReturn(null);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.getRoleOfMember("missing", "u"));
        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
    }
}
