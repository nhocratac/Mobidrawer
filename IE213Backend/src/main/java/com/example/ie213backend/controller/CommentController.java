package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.CommentDto.UpdateCommentDto;
import com.example.ie213backend.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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

    @GetMapping
    public ResponseEntity<Page<CommentDto>> getCommentsByBlogId(@RequestParam String blogId,
                                                                @RequestParam(required = false) String currUserId,
                                                                @RequestParam int page,
                                                                @RequestParam(defaultValue = "5") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<CommentDto> res = commentService.getCommentsByBlogId(blogId, currUserId, pageable);

        return ResponseEntity.ok(res);
    }

    @PatchMapping
    public ResponseEntity<CommentDto> updateComment(@RequestBody @Valid UpdateCommentDto updateCommentDto) {
        CommentDto commentRes = commentService.updateComment(updateCommentDto);

        return ResponseEntity.ok(commentRes);
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable String commentId,
                                              @RequestParam String userId) {
        commentService.deleteComment(commentId, userId);
        return ResponseEntity.noContent().build(); // HTTP 204
    }

    @GetMapping("/{commentId}/replies")
    public ResponseEntity<Page<CommentDto>> getReplies(@PathVariable String commentId,
                                                       @RequestParam(required = false) String userId,
                                                       @RequestParam int page) {
        Pageable pageable = PageRequest.of(page, 3, Sort.by("createdAt").descending());
        Page<CommentDto> res = commentService.getSubComments(commentId, userId, pageable);

        return ResponseEntity.ok(res);
    }
}
