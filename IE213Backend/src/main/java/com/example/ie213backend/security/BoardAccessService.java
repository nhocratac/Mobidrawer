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

        if (!isOwnerOrMember(board, userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa board này");
        }
    }

    /**
     * Role-aware guard for board-content mutations: only the board owner or an
     * EDITOR member may edit. A VIEWER member (who still passes
     * {@link #assertCanWrite}/{@link #canAccess}) is denied 403.
     */
    public void assertCanEdit(String boardId, String userId) {
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa board này");
        }

        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));

        boolean isOwner = Objects.equals(userId, board.getOwner());
        boolean isEditor = board.getMembers().stream()
                .anyMatch(member -> Objects.equals(member.getMemberId(), userId)
                        && member.getRole() == Board.ROLE.EDITOR);
        if (!isOwner && !isEditor) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa board này");
        }
    }

    public void assertCanWriteToCanvasPath(String canvasPathId, String userId) {
        CanvasPath canvasPath = canvaPathRepository.findById(canvasPathId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Canvas path not found"));

        assertCanEdit(canvasPath.getBoardId(), userId);
    }

    /**
     * Fail-closed boolean form of the owner-or-member predicate, for callers
     * (e.g. STOMP SUBSCRIBE/SEND authorization) that need an allow/decision
     * without exception-for-control-flow. Never throws for a deny: returns
     * false on a null user, a null/blank boardId, an absent board, or a
     * non-member/non-owner userId; true otherwise.
     */
    public boolean canAccess(String boardId, String userId) {
        if (userId == null || boardId == null || boardId.isBlank()) {
            return false;
        }
        return boardRepository.findById(boardId)
                .map(board -> isOwnerOrMember(board, userId))
                .orElse(false);
    }

    /**
     * Single shared owner-or-member decision core, used by both assertCanWrite
     * (which throws) and canAccess (which returns false). Keeping exactly one
     * copy of this comparison avoids divergent membership predicates.
     */
    private boolean isOwnerOrMember(Board board, String userId) {
        boolean isOwner = Objects.equals(userId, board.getOwner());
        boolean isMember = board.getMembers().stream()
                .anyMatch(member -> Objects.equals(member.getMemberId(), userId));
        return isOwner || isMember;
    }
}
