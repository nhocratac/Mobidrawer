package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.ApiTemplateResponse;
import com.example.ie213backend.domain.dto.CommentDto.CommentReactionDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentReactionDto;
import com.example.ie213backend.service.CommentReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "${api.prefix}/comment-reaction")
@RequiredArgsConstructor
public class CommentReactionController {
    private final CommentReactionService commentReactionService;

    @PostMapping
    public ResponseEntity<ApiTemplateResponse<CommentReactionDto>> interactComment(@RequestBody CreateCommentReactionDto commentReactionDto) {
        ApiTemplateResponse<CommentReactionDto> res = commentReactionService.interactComment(commentReactionDto);

        return ResponseEntity.ok(res);
    }
}
