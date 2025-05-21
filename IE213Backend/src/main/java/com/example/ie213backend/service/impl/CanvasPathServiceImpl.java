package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateCanvasPath;
import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateMultipleCanvasPaths;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.CanvaPathRepository;
import com.example.ie213backend.service.CanvasPathService;
import com.example.ie213backend.service.BoardService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;


@Service
@RequiredArgsConstructor
public class CanvasPathServiceImpl implements CanvasPathService {
    private final CanvaPathRepository canvasPathRepository;
    private final BoardRepository boardRepository;
    private final BoardService boardService;

    public CanvasPath createCanvas(CanvasPath canvas)  {
        String boardId = canvas.getBoardId();
        Board board = boardRepository.findUserRoleInBoard(boardId, canvas.getOwner())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền vẽ trên bảng này"));
        if(board.getOwner().equals(canvas.getOwner())) {
            return canvasPathRepository.save(canvas);
        }
        if( board.getMembers().stream().anyMatch(
                member -> (member.getMemberId().equals(canvas.getOwner()) && member.getRole() == Board.ROLE.EDITOR)
        )) {
            return canvasPathRepository.save(canvas);
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền vẽ trên bảng này");
    }

    public void deleteCanvas(String id, String boardId, String userId) {
        String role  = boardService.getRoleOfMember(boardId, userId);
        if(Objects.equals(role, "EDITOR") | Objects.equals(role,"OWNER"))
            canvasPathRepository.deleteById(id);
        else
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa canvas này");
    }

    public List<CanvasPath> updateMultipleCanvasPaths(UpdateMultipleCanvasPaths updatePaths, String boardId, String userId) {
        String role = boardService.getRoleOfMember(boardId, userId);
        if(!Objects.equals(role, "EDITOR") && !Objects.equals(role, "OWNER")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền sửa path này");
        }
        return updatePaths.getPaths().stream()
                .map(path -> {
                    CanvasPath existingPath = canvasPathRepository.findById(path.getId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đường vẽ"));
                    existingPath.setColor(path.getColor());
                    existingPath.setThickness(path.getThickness());
                    existingPath.setOpacity(path.getOpacity());
                    existingPath.setPaths(
                            path.getPaths().stream()
                                    .map(dto -> new CanvasPath.Coordinate(dto.getX(), dto.getY()))
                                    .collect(Collectors.toList())
                    );
                    existingPath.setUpdateAt(LocalDateTime.now());
                    return canvasPathRepository.save(existingPath);
                })
                .collect(Collectors.toList());
    }
}
