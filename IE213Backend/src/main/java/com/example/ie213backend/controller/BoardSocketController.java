package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.CanvasPathDto.CreateCanvasPath;
import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateCanvasPath;
import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateMultipleCanvasPaths;
import com.example.ie213backend.domain.dto.ImageDto.CreateImage;
import com.example.ie213backend.domain.dto.ImageDto.DeleteImage;
import com.example.ie213backend.domain.dto.ImageDto.MoveImage;
import com.example.ie213backend.domain.dto.ImageDto.ResizeImage;
import com.example.ie213backend.domain.dto.StickyNote.*;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.domain.model.Image;
import com.example.ie213backend.domain.model.StickyNote;
import com.example.ie213backend.domain.model.Template;
import com.example.ie213backend.mapper.CanvasPathMapper;
import com.example.ie213backend.mapper.ImageMapper;
import com.example.ie213backend.mapper.StickyNoteMapper;
import com.example.ie213backend.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class BoardSocketController {

    private final CanvasPathService canvasPathService;

    private final StickyNoteService stickyNoteService;

    private final CacheUserInBoardService cacheUserInBoardService;

    private final BoardService boardService;
    private final ImageService imageService;

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
            @Payload  CreateCanvasPath createCanvasPath
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        CanvasPath canvasPath = CanvasPathMapper.INSTANCE.createCanvasPathToEntity(createCanvasPath);
        canvasPath.setBoardId(boardId);
        canvasPath.setOwner(userDto.getId());
        return canvasPathService.createCanvas(canvasPath);
    }

    @MessageMapping("/board/delete-paths/{boardId}")
    @SendTo("/topic/board/delete-paths/{boardId}")
    public Map<String, Object> handleDeletePaths(
            @DestinationVariable String boardId,
            @Payload List<String> pathIds,          // Danh sách ID các path cần xóa
            SimpMessageHeaderAccessor headerAccessor // Để lấy thông tin user (nếu cần)
    ) {
        // Xác thực user (nếu cần)
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");

        // Xóa từng path một (phù hợp với service hiện có)
        pathIds.forEach(pathId -> {
            canvasPathService.deleteCanvas(pathId, boardId, userDto.getId());
        });

        String senderSessionId = headerAccessor.getSessionId();

        // Trả về danh sách ID đã xóa để client cập nhật UI
        return Map.of(
                "deletePaths", pathIds,
                "senderSessionId", senderSessionId
        );
    }

    @MessageMapping("/board/update-paths/{boardId}")
    @SendTo("/topic/board/update-paths/{boardId}")
    public Map<String, Object> handleUpdatePaths(
            @DestinationVariable String boardId,
            @Payload @Valid UpdateMultipleCanvasPaths canvas,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        UserDto userDto = (UserDto) headerAccessor.getSessionAttributes().get("user");
        List<CanvasPath> updatedPaths = canvasPathService.updateMultipleCanvasPaths(canvas, boardId, userDto.getId());

        String senderSessionId = headerAccessor.getSessionId();

        return Map.of(
                "updatedPaths", updatedPaths,
                "senderSessionId", senderSessionId
        );
    }

    @MessageMapping("/board/move-paths/{boardId}")
    @SendTo("/topic/board/move-paths/{boardId}")
    public Map<String, Object> handleMovePaths(
            @DestinationVariable String boardId,
            @Payload @Valid List<CanvasPath> canvas,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        UserDto userDto = (UserDto) headerAccessor.getSessionAttributes().get("user");
        String role = boardService.getRoleOfMember(boardId, userDto.getId());
        if(!Objects.equals(role, "EDITOR") && !Objects.equals(role, "OWNER")) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không có quyền sửa path này");
        }

        String senderSessionId = headerAccessor.getSessionId();

        return Map.of(
                "updatedPaths", canvas,
                "senderSessionId", senderSessionId
        );
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

    @MessageMapping("/board/addStickyNotes/{boardId}")
    @SendTo("/topic/board/addStickyNotes/{boardId}")
    public List<StickyNote> addStickyNotes(
            @DestinationVariable String boardId,
            SimpMessageHeaderAccessor headerAccessor,
            @Payload List<CreateStickyNote> createStickyNotes
    ) {
        UserDto userDto = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        
        List<StickyNote> stickyNotes = createStickyNotes.stream()
                .map(noteDto -> {
                    StickyNote note = StickyNoteMapper.INSTANCE.createToEntity(noteDto);
                    note.setBoardId(boardId);
                    note.setOwner(userDto.getId());
                    return note;
                })
                .collect(Collectors.toList());

        return stickyNoteService.createStickyNotes(stickyNotes);
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

    @MessageMapping("/board/cursor/{boardId}")
    @SendTo("/topic/board/cursor/{boardId}")
    public Map<String, Object> handleCursorMovement(
            @DestinationVariable String boardId,
            @Payload Map<String, Object> cursorData,
            SimpMessageHeaderAccessor headerAccessor) {
        UserDto user = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");

        cursorData.put("userId", user.getId());
        cursorData.put("userName", user.getFirstName() + " " + user.getLastName());
        cursorData.put("color", user.getColor());
        String senderSessionId = headerAccessor.getSessionId();

        cursorData.put("lastUpdated", System.currentTimeMillis());
        assert senderSessionId != null;
        return Map.of(
                "cursorData", cursorData,
                "senderSessionId", senderSessionId
        );
    }

    @MessageMapping("/board/image/{boardId}")
    @SendTo("/topic/board/image/{boardId}")
    public Map<String, Object> handleCreateImage(
            @DestinationVariable String boardId,
            @Payload CreateImage createImage,
            SimpMessageHeaderAccessor headerAccessor) {
        UserDto user = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        Image image = ImageMapper.INSTANCE.CreateDtoImage(createImage);
        image.setBoardId(boardId);
        image.setOwner(user.getId());
        String senderSessionId = headerAccessor.getSessionId();
        Image res =  imageService.createImage(image);
        assert senderSessionId != null;

        return Map.of("image", res,
                "senderSessionId" , senderSessionId
        );
    }

    @MessageMapping("/board/images/{boardId}")
    @SendTo("/topic/board/images/{boardId}")
    public Map<String, Object> handleCreateImages(
            @DestinationVariable String boardId,
            @Payload List<CreateImage> createImages,
            SimpMessageHeaderAccessor headerAccessor) {
        UserDto user = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        List<Image>  images =  createImages.stream().map(
                imagedto -> {
                    Image img = ImageMapper.INSTANCE.CreateDtoImage(imagedto);
                    img.setBoardId(boardId);
                    img.setOwner(user.getId());
                    return img;
                }
        ).toList();
        String senderSessionId = headerAccessor.getSessionId();
        List<Image> res =  imageService.createImages(images);
        assert senderSessionId != null;

        return Map.of("images", res,
                "senderSessionId" , senderSessionId
        );
    }

    @MessageMapping("/board/moveImage/{boardId}")
    @SendTo("/topic/board/moveImage/{boardId}")
    public Map<String, Object> handleMoveImage(
            @DestinationVariable String boardId,
            @Payload MoveImage moveImage,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        UserDto user = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        String senderSessionId = headerAccessor.getSessionId();
        assert senderSessionId != null;
        Image image = ImageMapper.INSTANCE.MoveToDtoImage(moveImage);
        image.setBoardId(boardId);
        image.setOwner(user.getId());
        return Map.of(
                "image", imageService.updateImagePosition(image),
                "senderSessionId" , senderSessionId
        );
    }

    @MessageMapping("/board/resizeImage/{boardId}")
    @SendTo("/topic/board/resizeImage/{boardId}")
    public Map<String, Object> handleResizeImage(
            @DestinationVariable String boardId,
            @Payload ResizeImage resizeImage,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        UserDto user = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        String senderSessionId = headerAccessor.getSessionId();
        assert senderSessionId != null;
        Image image = ImageMapper.INSTANCE.ResizeDtoImage(resizeImage);
        image.setBoardId(boardId);
        image.setOwner(user.getId());
        return Map.of(
                "image", imageService.updateImageSize(image),
                "senderSessionId" , senderSessionId
        );
    }

    @MessageMapping("/board/deleteImage/{boardId}")
    @SendTo("/topic/board/deleteImage/{boardId}")
    public Map<String, Object> handleDeleteImage(
            @DestinationVariable String boardId,
            @Payload DeleteImage deleteImage,
            SimpMessageHeaderAccessor headerAccessor
    ) {
        UserDto user = (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
        String senderSessionId = headerAccessor.getSessionId();
        assert senderSessionId != null;
        imageService.deleteImage(deleteImage.getId(),boardId,user.getId());
        return Map.of(
                "id" , deleteImage.getId() ,
                "senderSessionId", senderSessionId
        );
    }
}
