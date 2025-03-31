package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.StickyNote.CreateStickyNote;
import com.example.ie213backend.domain.dto.StickyNote.StickyNoteDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.StickyNote;
import com.example.ie213backend.mapper.StickyNoteMapper;
import com.example.ie213backend.service.StickyNoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("${api.prefix}/note")
@RequiredArgsConstructor
public class StickyNoteController {
    private final StickyNoteService stickyNoteService;

    @PostMapping("/{boardId}")
    ResponseEntity<StickyNoteDto> saveNote(
            @RequestAttribute("user") UserDto userDto,
            @RequestBody @Valid CreateStickyNote createStickyNote,
            @PathVariable String boardId
    ) {
        StickyNote create = StickyNoteMapper.INSTANCE.createToEntity(createStickyNote);
        create.setOwner(userDto.getId());
        create.setBoardId(boardId);
        return ResponseEntity.ok(StickyNoteMapper.INSTANCE.toDTO(stickyNoteService.createStickyNote(create)));
    }
}
