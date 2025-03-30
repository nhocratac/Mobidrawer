package com.example.ie213backend.controller;

import com.example.ie213backend.domain.model.GeminiPrompt;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.GeminiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/chat-gemini")
@RequiredArgsConstructor
public class GeminiController {

    private final GeminiService geminiService;

    @PostMapping
    public ResponseEntity<String> generateText(
            @RequestAttribute("user") UserDto userDto,
            @RequestBody GeminiPrompt prompt
    ) {
        String response = geminiService.generateText(
                prompt.getPrompt(),
                userDto.getId()
        );
        return ResponseEntity.ok(response);
    }
}
