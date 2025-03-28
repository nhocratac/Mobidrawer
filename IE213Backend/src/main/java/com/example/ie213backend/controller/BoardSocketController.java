package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.CanvasPathDto.CreateCanvasPath;
import com.example.ie213backend.domain.dto.StickyNote.ChangeText;
import com.example.ie213backend.domain.dto.StickyNote.CreateStickyNote;
import com.example.ie213backend.domain.dto.StickyNote.MoveStickyNote;
import com.example.ie213backend.domain.dto.StickyNote.ResizeStickyNote;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.domain.model.StickyNote;
import com.example.ie213backend.mapper.CanvasPathMapper;
import com.example.ie213backend.mapper.StickyNoteMapper;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.service.BoardService;
import com.example.ie213backend.service.CanvasPathService;
import com.example.ie213backend.service.StickyNoteService;
import com.example.ie213backend.service.UserService;
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

@Controller
@RequiredArgsConstructor
public class BoardSocketController {
    private final BoardService boardService;

    private final CanvasPathService canvasPathService;

    private final StickyNoteService stickyNoteService;

    private final UserService userService;
    private final UserMapper userMapper;

    @MessageMapping("/connect")
    @SendToUser("/queue/session")
    public Map<String, String> handleConnect(SimpMessageHeaderAccessor headerAccessor) {
        String sessionId = headerAccessor.getSessionId();
        assert sessionId != null;
        return Map.of("sessionId", sessionId);
    }

    @MessageMapping("/board/add-new-path/{id}")  // Nhận message từ client
    @SendTo("/topic/board/{id}")  // Gửi đến tất cả client đăng ký "/topic/messages"
    public ResponseEntity<CanvasPath> handleWebSocketMessage(
            @Payload @Valid CanvasPath canvasPath,
            @DestinationVariable String id
    ) {
        return ResponseEntity.ok(boardService.addCanvasPath(id, canvasPath));
    }

    @MessageMapping("/board/join/{boardId}")
    @SendTo("/topic/board/{boardId}")
    public UserDto handleUserJoin(
            SimpMessageHeaderAccessor headerAccessor,
            @DestinationVariable String boardId
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        // Trả về thông báo cho tất cả client trong topic
        return userMapper.toDto(userService.getBaseInFormation(userDto.getId()));
    }


    @MessageMapping("/draw")  // Nhận tin nhắn từ client gửi đến "/app/draw"
    @SendTo("/topic/draw")    // Gửi tin nhắn đến tất cả client đăng ký "/topic/draw"
    public String handleDrawEvent(String message) {
        return message;  // Gửi lại tin nhắn tới các client khác
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
}
