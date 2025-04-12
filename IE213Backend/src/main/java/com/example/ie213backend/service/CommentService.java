package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.CommentDto.InteractionCommentDto;
import org.springframework.data.domain.Page;

public interface CommentService {
    CommentDto getCommentById(String commentId);
    Page<CommentDto> getCommentsByBlogId(String blogId, int page, int size);
    CommentDto createComment(CreateCommentDto createCommentDto);
    CommentDto createOrRemoveInteraction(InteractionCommentDto interactionCommentDto);
}
