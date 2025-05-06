package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.CanvasPathDto.CreateCanvasPath;
import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateCanvasPath;
import com.example.ie213backend.domain.dto.StickyNote.*;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.domain.model.StickyNote;
import com.example.ie213backend.mapper.CanvasPathMapper;
import com.example.ie213backend.mapper.StickyNoteMapper;
import com.example.ie213backend.service.CacheUserInBoardService;
import com.example.ie213backend.service.CanvasPathService;
import com.example.ie213backend.service.StickyNoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Controller
@RequiredArgsConstructor
public class BoardSocketController {

    private final CanvasPathService canvasPathService;

    private final StickyNoteService stickyNoteService;

    private final CacheUserInBoardService cacheUserInBoardService;

    @MessageMapping("/connect")
    @SendToUser("/queue/session")
    public Map<String, String> handleConnect(SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        assert sessionId != null;
        return Map.of("sessionId", sessionId);
    }


    @MessageMapping("/board/join/{boardId}")
    @SendTo("/topic/board/{boardId}")
    public Set<UserDto> handleUserJoin(
            SimpMessageHeaderAccessor headerAccessor,
            @DestinationVariable String boardId
    )  {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        return cacheUserInBoardService.addUserToBoard(boardId, userDto);
    }

    @MessageMapping("/board/leave/{boardId}")
    @SendTo("/topic/board/{boardId}")
    public Set<UserDto> handleUserLeave(
            SimpMessageHeaderAccessor headerAccessor,
            @DestinationVariable String boardId
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        cacheUserInBoardService.removeUserFromBoard(boardId, userDto.getId());
        return cacheUserInBoardService.getUsersInBoard(boardId);
    }


    @MessageMapping("/board/draw/{boardId}")  // Nhận tin nhắn từ client gửi đến "/app/draw"
    @SendTo("/topic/draw/board/{boardId}")
    public CanvasPath  createCanvasPath(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload  CreateCanvasPath canvasPath
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        return (canvasPathService.CreateCanvas(CanvasPathMapper.INSTANCE.createCanvasPathToEntity(canvasPath),userDto.getId() ));
    }

    @MessageMapping("/board/delete-paths/{id}")
    @SendTo("/topic/board/{id}")
    public ResponseEntity<List<String>> handleDeletePaths(
            @DestinationVariable String id,
            @Payload List<String> pathIds,          // Danh sách ID các path cần xóa
            SimpMessageHeaderAccessor headerAccessor // Để lấy thông tin user (nếu cần)
    ) {
        // Xác thực user (nếu cần)
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");

        // Xóa từng path một (phù hợp với service hiện có)
        pathIds.forEach(pathId -> {
            canvasPathService.deleteCanvas(pathId, userDto.getId());
        });

        // Trả về danh sách ID đã xóa để client cập nhật UI
        return ResponseEntity.ok(pathIds);
    }

    @MessageMapping("/board/update-path/{boardId}")
    @SendTo("/topic/board/{boardId}")
    public ResponseEntity<CanvasPath> handleUpdatePaths(
            @DestinationVariable String boardId,
            @Payload @Valid UpdateCanvasPath canvas,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        UserDto userDto = (UserDto) headerAccessor.getSessionAttributes().get("user");
        CanvasPath updatedCanvas = canvasPathService.updateCanvas(canvas, userDto.getId());
        return ResponseEntity.ok(updatedCanvas);
    }

    @MessageMapping("/board/addStickyNote/{boardId}")
    @SendTo("/topic/board/addStickyNote/{boardId}")
    public StickyNote addStickyNote(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload CreateStickyNote createStickyNote
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        StickyNote stickyNote = StickyNoteMapper.INSTANCE.createToEntity(createStickyNote);
        stickyNote.setBoardId(boardId);
        stickyNote.setOwner(userDto.getId());
        return stickyNoteService.createStickyNote(stickyNote);
    }

    @MessageMapping("/board/moveStickyNote/{boardId}")
    @SendTo("/topic/board/moveStickyNote/{boardId}")
    public Map<String, Object> handleMoveStickyNote(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload MoveStickyNote moveStickyNote
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");

        StickyNote moved = stickyNoteService.updateStickyNotePosition(
                moveStickyNote.getId(), boardId, userDto.getId(),
                moveStickyNote.getPosition().getX(), moveStickyNote.getPosition().getY()
        );

        MoveStickyNote response = StickyNoteMapper.INSTANCE.toMoveStickyNote(moved);
        String senderSessionId = headerAccessor.getSessionId();

        // Trả về payload với thông tin senderSessionId
        assert senderSessionId != null;
        return Map.of(
                "stickyNote", response,
                "senderSessionId", senderSessionId
        );
    }

    @MessageMapping("/board/reSizeStickyNote/{boardId}")
    @SendTo("/topic/board/reSizeStickyNote/{boardId}")
    public Map<String, Object> handleReSizeStickyNote(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload ResizeStickyNote resizeStickyNote
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        StickyNote stickyNote = StickyNoteMapper.INSTANCE.ResizeToEntity(resizeStickyNote);
        stickyNote.setBoardId(boardId);
        stickyNote.setOwner(userDto.getId());

        ResizeStickyNote response = StickyNoteMapper.INSTANCE.toResizeStickyNote(stickyNoteService.updateStickyNoteSize(stickyNote));
        String senderSessionId = headerAccessor.getSessionId();
        assert senderSessionId != null;
        return Map.of(
                "stickyNote" , response,
        "senderSessionId", senderSessionId
        );
    }

    @MessageMapping("/board/ChangeTextStickyNote/{boardId}")
    @SendTo("/topic/board/ChangeTextStickyNote/{boardId}")
    public Map<String, Object> handleChangeTextStickyNote(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload ChangeText changeTextStickyNote
    )  {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        StickyNote stickyNote = StickyNoteMapper.INSTANCE.ChangeTextToEntity(changeTextStickyNote);
        stickyNote.setBoardId(boardId);
        stickyNote.setOwner(userDto.getId());

        ChangeText response  = StickyNoteMapper.INSTANCE.toChangeText(stickyNoteService.chaneTextStickyNote(stickyNote));
        String senderSessionId = headerAccessor.getSessionId();
        assert senderSessionId != null;
        return Map.of(
                "stickyNote" , response,
                "senderSessionId", senderSessionId
        );
    }

    @MessageMapping("/board/lockStickyNote/{boardId}")
    @SendTo("/topic/board/lockStickyNote/{boardId}")
    public Map<String, Object> handleLockStickyNote(
        @DestinationVariable String boardId,
        SimpMessageHeaderAccessor headerAccessor,
        @Payload LockStickyNote lockStickyNote
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        return Map.of(
                "id" , lockStickyNote.getId(),
                "userId", userDto.getId()
        );
    }

    @MessageMapping("/board/unLockStickyNote/{boardId}")
    @SendTo("/topic/board/unLockStickyNote/{boardId}")
    public Map<String, Object> handleUnLockStickyNote(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload LockStickyNote lockStickyNote
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        return Map.of(
                "id" , lockStickyNote.getId(),
                "userId", userDto.getId()
        );
    }

    @MessageMapping("/board/deleteStickyNote/{boardId}")
    @SendTo("/topic/board/deleteStickyNote/{boardId}")
    public Map<String, Object> handleDeleteStickyNote(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload DeleteStickyNote deleteStickyNote
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        stickyNoteService.deleteStickyNote(deleteStickyNote.getId(), boardId, userDto.getId());
        return Map.of(
                "id" , deleteStickyNote.getId(),
                "userId", userDto.getId()
        );
    }

}
