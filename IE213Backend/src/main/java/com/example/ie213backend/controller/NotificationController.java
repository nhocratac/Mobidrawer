package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.NotificationDto.MarkNotificationAsReadDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Notification;
import com.example.ie213backend.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("${api.prefix}/notification")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/")
    public List<Notification> getNotifications(
            @RequestAttribute("user") UserDto userDto
    ) {
        return notificationService.getNotifications(userDto.getId());
    }

    @PostMapping("/joinBoard/{boardId}")
    public Notification joinBoard(
            @PathVariable String boardId,
             @RequestAttribute("user") UserDto userDto
    ) {

        return notificationService.sendRequestJoinBoard(userDto.getId(), boardId);
    }

    @PostMapping("/mark-as-read")
    public ResponseEntity<List<Notification>> markAsRead(@Valid @RequestBody MarkNotificationAsReadDto asReadDto) {
        List<Notification> notifications = notificationService.markNotificationAsRead(asReadDto.getUserId(), asReadDto.getNotificationIds());

        return ResponseEntity.ok(notifications);
    }
}
