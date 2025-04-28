package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.ApiTemplateResponse;
import com.example.ie213backend.domain.dto.CommentDto.CommentReactInfoDto;
import com.example.ie213backend.domain.dto.CommentDto.CommentReactionDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentReactionDto;

public interface CommentReactionService {
    CommentReactInfoDto getCommentReactInfo(String commentId, String userId);
    ApiTemplateResponse<CommentReactionDto> interactComment(CreateCommentReactionDto commentReactionDto);
    void deleteReactionByCommentId(String commentId);
}
