package com.example.ie213backend.security;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.CanvaPathRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Objects;

/**
 * Single shared write-authorization guard for board-content mutations (SEC-1).
 * Deny-by-default: unknown board, null identity, or non-owner/non-member are all denied.
 */
@Service
@RequiredArgsConstructor
public class BoardAccessService {

    private final BoardRepository boardRepository;
    private final CanvaPathRepository canvaPathRepository;

    public void assertCanWrite(String boardId, String userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa board này");
        }

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));

        boolean isOwner = Objects.equals(userId, board.getOwner());
        boolean isMember = board.getMembers().stream()
                .anyMatch(member -> Objects.equals(member.getMemberId(), userId));

        if (!isOwner && !isMember) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa board này");
        }
    }

    public void assertCanWriteToCanvasPath(String canvasPathId, String userId) {
        CanvasPath canvasPath = canvaPathRepository.findById(canvasPathId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canvas path not found"));

        assertCanWrite(canvasPath.getBoardId(), userId);
    }
}
