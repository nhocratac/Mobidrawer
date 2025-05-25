package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.CanvasPathDto.CreateCanvasPath;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.mapper.CanvasPathMapper;
import com.example.ie213backend.service.CanvasPathService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/canvas")
@RequiredArgsConstructor
public class CanvasPathController {
    private final CanvasPathService canvasPathService;

    @PostMapping("/")
    public ResponseEntity<CanvasPath> createCanvasPath(
            @RequestAttribute("user") UserDto userDto,
            @RequestBody @Valid CreateCanvasPath canvasPath

    ) {
        return ResponseEntity.ok(canvasPathService.createCanvas(CanvasPathMapper.INSTANCE.createCanvasPathToEntity(canvasPath)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCanvasPath(
            @RequestAttribute("user") UserDto userDto,
            @Payload String boardId,
            @PathVariable String id
    ) {
        canvasPathService.deleteCanvas(id, boardId, userDto.getId());
        return ResponseEntity.noContent().build();
    }
}