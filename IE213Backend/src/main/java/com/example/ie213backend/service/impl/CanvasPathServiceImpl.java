package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateCanvasPath;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.CanvaPathRepository;
import com.example.ie213backend.service.CanvasPathService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;


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

    public void deleteCanvas(String id, String userId) {
        ObjectId objectId;
        try {
            objectId = new ObjectId(id);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID không hợp lệ");
        }

        CanvasPath canvasPath = canvasPathRepository.findById(objectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy canvas"));

        String boardId = canvasPath.getBoardId();
        Board board = boardRepository.findById(boardId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy bảng"));

        // Cho phép owner hoặc member có quyền EDIT xóa canvas
        if (board.getOwner().equals(userId)) {
            canvasPathRepository.delete(canvasPath);
            return;
        }

        boolean isEditor = board.getMembers().stream()
                .anyMatch(member -> member.getMemberId().equals(userId) && member.getRole() == Board.ROLE.EDITOR);

        if (isEditor) {
            canvasPathRepository.delete(canvasPath);
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa canvas này");
    }

    public CanvasPath updateCanvas(UpdateCanvasPath updatePath, String userId) {
        // 1. Validate ObjectId
        ObjectId objectId;
        try {
            objectId = new ObjectId(updatePath.getId());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ID không hợp lệ");
        }

        // 2. Kiểm tra tồn tại path
        CanvasPath existingPath = canvasPathRepository.findById(objectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đường vẽ"));

        // 3. Validate owner
        if (!existingPath.getOwner().equals(updatePath.getOwner())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền sửa path này");
        }

        // 4. Kiểm tra quyền trên board (dùng owner từ DTO)
        Board board = boardRepository.findUserRoleInBoard(updatePath.getBoardId(), updatePath.getOwner())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền chỉnh sửa"));

        boolean isOwner = board.getOwner().equals(updatePath.getOwner());
        boolean isEditor = board.getMembers().stream()
                .anyMatch(member -> member.getMemberId().equals(updatePath.getOwner())
                        && member.getRole() == Board.ROLE.EDITOR);

        if (!isOwner && !isEditor) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền chỉnh sửa");
        }

        // 5. Cập nhật thông tin
        existingPath.setColor(updatePath.getColor());
        existingPath.setThickness(updatePath.getThickness());
        existingPath.setOpacity(updatePath.getOpacity());
        existingPath.setPaths(
                updatePath.getPaths().stream()
                        .map(dto -> new CanvasPath.Coordinate(dto.getX(), dto.getY()))
                        .collect(Collectors.toList())
        );

        existingPath.setUpdateAt(LocalDateTime.now()); // Cập nhật thời gian tự động
        return canvasPathRepository.save(existingPath);
    }
}
