package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.CommentDto.InteractionCommentDto;
import com.example.ie213backend.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(path = "${api.prefix}/comments")
@RequiredArgsConstructor
public class CommentController {
    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<CommentDto> createComment(@RequestBody @Valid CreateCommentDto createCommentDto) {
        CommentDto commentRes = commentService.createComment(createCommentDto);

        return ResponseEntity.ok(commentRes);
    }

    @PostMapping("/{commentId}/interaction")
    public ResponseEntity<CommentDto> createOrRemoveInteraction(@PathVariable String commentId,
                                                        @RequestBody @Valid InteractionCommentDto interactionCommentDto) {
        interactionCommentDto.setCommentId(commentId);
        CommentDto commentDto = commentService.createOrRemoveInteraction(interactionCommentDto);

        return ResponseEntity.ok(commentDto);
    }
}
