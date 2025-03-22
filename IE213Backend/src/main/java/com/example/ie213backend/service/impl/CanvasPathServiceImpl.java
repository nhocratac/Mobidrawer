package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.CanvaPathRepository;
import com.example.ie213backend.service.CanvasPathService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;


@Service
@RequiredArgsConstructor
public class CanvasPathServiceImpl implements CanvasPathService {
    private final CanvaPathRepository canvasPathRepository;
    private final BoardRepository boardRepository;

    public CanvasPath CreateCanvas(CanvasPath canvas, String owner)  {
        String boardId = canvas.getBoardId();

        Board board = boardRepository.findUserRoleInBoard(boardId, owner)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền vẽ trên bảng này"));
        canvas.setOwner(owner);
        if(board.getOwner().equals(owner)) {

            return canvasPathRepository.save(canvas);
        }
        if( board.getMembers().stream().anyMatch(
                member -> (member.getMemberId().equals(owner) && member.getRole() == Board.ROLE.EDITOR)
        )) {

            return canvasPathRepository.save(canvas);
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền vẽ trên bảng này");
    }
}
