package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.CommentDto.UpdateCommentDto;
import com.example.ie213backend.domain.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

public interface CommentService {
    CommentDto createComment(CreateCommentDto createCommentDto);
    CommentDto updateComment(UpdateCommentDto updateCommentDto);
    void deleteComment(String commentId, String userId);
    Page<CommentDto> getCommentsByBlogId(String blogId, String currUserId, Pageable pageable);
    Page<CommentDto> getSubComments(String commentId, String currUserId, Pageable pageable);
    Comment getCommentById(String commentId);
}
