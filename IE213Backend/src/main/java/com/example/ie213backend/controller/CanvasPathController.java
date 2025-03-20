package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.CanvasPathDto.CreateCanvasPath;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.CanvasPath;
import com.example.ie213backend.mapper.CanvasPathMapper;
import com.example.ie213backend.service.CanvasPathService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
        return ResponseEntity.ok(canvasPathService.CreateCanvas(CanvasPathMapper.INSTANCE.createCanvasPathToEntity(canvasPath),userDto.getId() ));
    }
}
