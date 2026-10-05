package com.example.ie213backend.controller;

import com.example.ie213backend.config.socket.ElementLockRegistry;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.BoardElement;
import com.example.ie213backend.service.element.BoardElementService;
import com.example.ie213backend.service.element.ElementPatches;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

// Realtime cho element thống nhất: mọi thay đổi phát trên /topic/board/{boardId}/el
@Controller
@RequiredArgsConstructor
public class BoardElementSocketController {
    private final BoardElementService elementService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ElementLockRegistry lockRegistry;

    private UserDto user(SimpMessageHeaderAccessor headerAccessor) {
        return (UserDto) Objects.requireNonNull(headerAccessor.getSessionAttributes()).get("user");
    }

    private void broadcast(String boardId, String op, SimpMessageHeaderAccessor headerAccessor, String key, Object value) {
        send(boardId, op, headerAccessor.getSessionId(), user(headerAccessor).getId(), key, value);
    }

    private void send(String boardId, String op, String sessionId, String userId, String key, Object value) {
        Map<String, Object> message = new HashMap<>();
        message.put("op", op);
        message.put("senderSessionId", sessionId);
        message.put("userId", userId);
        message.put(key, value);
        messagingTemplate.convertAndSend("/topic/board/" + boardId + "/el", message);
    }

    @MessageMapping("/board/{boardId}/el/create")
    public void create(@DestinationVariable String boardId,
                       @Payload Map<String, List<BoardElement>> body,
                       SimpMessageHeaderAccessor headerAccessor) {
        List<BoardElement> created = elementService.create(boardId, user(headerAccessor).getId(),
                body.getOrDefault("elements", List.of()));
        if (!created.isEmpty()) broadcast(boardId, "create", headerAccessor, "elements", created);
    }

    @MessageMapping("/board/{boardId}/el/patch")
    public void patch(@DestinationVariable String boardId,
                      @Payload ElementPatches.PatchBody body,
                      SimpMessageHeaderAccessor headerAccessor) {
        List<Map<String, Object>> applied = elementService.patch(boardId, user(headerAccessor).getId(), body.patches());
        if (!applied.isEmpty()) broadcast(boardId, "patch", headerAccessor, "patches", applied);
    }

    // Chỉ relay khi đang kéo, không lưu DB
    @MessageMapping("/board/{boardId}/el/preview")
    public void preview(@DestinationVariable String boardId,
                        @Payload ElementPatches.PatchBody body,
                        SimpMessageHeaderAccessor headerAccessor) {
        elementService.requireEditor(boardId, user(headerAccessor).getId());
        // cùng whitelist như commit để preview không thể đổi type / image... trên màn hình người khác
        body.patches().forEach(p -> ElementPatches.toUpdate(p.set()));
        broadcast(boardId, "preview", headerAccessor, "patches", body.patches());
    }

    @MessageMapping("/board/{boardId}/el/delete")
    public void delete(@DestinationVariable String boardId,
                       @Payload Map<String, List<String>> body,
                       SimpMessageHeaderAccessor headerAccessor) {
        List<String> ids = elementService.delete(boardId, user(headerAccessor).getId(), body.getOrDefault("ids", List.of()));
        if (!ids.isEmpty()) broadcast(boardId, "delete", headerAccessor, "ids", ids);
    }

    @MessageMapping("/board/{boardId}/el/lock")
    public void lock(@DestinationVariable String boardId,
                     @Payload Map<String, String> body,
                     SimpMessageHeaderAccessor headerAccessor) {
        String userId = user(headerAccessor).getId();
        elementService.requireEditor(boardId, userId);
        // element đang bị người khác giữ: bỏ qua (client đã nhận lock của người đó và tự đóng ô sửa)
        if (!lockRegistry.lock(headerAccessor.getSessionId(), userId, boardId, body.get("id"))) return;
        broadcast(boardId, "lock", headerAccessor, "ids", List.of(body.get("id")));
    }

    @MessageMapping("/board/{boardId}/el/unlock")
    public void unlock(@DestinationVariable String boardId,
                       @Payload Map<String, String> body,
                       SimpMessageHeaderAccessor headerAccessor) {
        String userId = user(headerAccessor).getId();
        elementService.requireEditor(boardId, userId);
        // chỉ người giữ lock mới mở được
        if (!lockRegistry.unlock(userId, boardId, body.get("id"))) return;
        broadcast(boardId, "unlock", headerAccessor, "ids", List.of(body.get("id")));
    }

    // Người giữ lock mất kết nối: gỡ lock để người khác không bị chặn mãi
    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        releaseSessionLocks(event.getSessionId());
    }

    void releaseSessionLocks(String sessionId) {
        lockRegistry.releaseSession(sessionId).forEach(lock ->
                send(lock.boardId(), "unlock", lock.sessionId(), lock.userId(), "ids", List.of(lock.elementId())));
    }

    @MessageExceptionHandler
    @SendToUser("/queue/errors")
    public Map<String, Object> onError(Exception ex) {
        String reason = ex instanceof ResponseStatusException rse ? rse.getReason() : ex.getMessage();
        return Map.of("reason", reason == null ? "error" : reason);
    }
}
