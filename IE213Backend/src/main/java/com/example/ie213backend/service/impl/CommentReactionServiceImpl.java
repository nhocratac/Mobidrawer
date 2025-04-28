package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.ReactionType;
import com.example.ie213backend.domain.dto.ApiTemplateResponse;
import com.example.ie213backend.domain.dto.CommentDto.CommentReactInfoDto;
import com.example.ie213backend.domain.dto.CommentDto.CommentReactionDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentReactionDto;
import com.example.ie213backend.domain.model.CommentReaction;
import com.example.ie213backend.mapper.CommentReactionMapper;
import com.example.ie213backend.repository.CommentReactionRepository;
import com.example.ie213backend.service.CommentReactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CommentReactionServiceImpl implements CommentReactionService {
    private final CommentReactionRepository commentReactionRepository;
    private final CommentReactionMapper commentReactionMapper;

    @Override
    public CommentReactInfoDto getCommentReactInfo(String commentId, String userId) {
        int likeCount = commentReactionRepository.countByCommentIdAndType(commentId, ReactionType.LIKE);
        int dislikeCount = commentReactionRepository.countByCommentIdAndType(commentId, ReactionType.DISLIKE);
        Optional<CommentReaction> reaction = commentReactionRepository.findByUserIdAndCommentId(userId, commentId);


        CommentReactInfoDto.CommentReactInfoDtoBuilder builder = CommentReactInfoDto.builder()
                .likeCount(likeCount)
                .dislikeCount(dislikeCount);

        reaction.ifPresent(item -> builder.currentUserReaction(item.getType()));

        return builder.build();
    }

    @Override
    public ApiTemplateResponse<CommentReactionDto> interactComment(CreateCommentReactionDto commentReactionDto) {
        Optional<CommentReaction> commentReactionOptional = commentReactionRepository
                .findByUserIdAndCommentId(commentReactionDto.getUserId(), commentReactionDto.getCommentId());

        CommentReaction commentReaction = null;
        String message;
        ReactionType newReactionType = commentReactionDto.getType();

        if (commentReactionOptional.isPresent()) {
            commentReaction = commentReactionOptional.get();

            if (newReactionType != null) {
                if (!newReactionType.equals(commentReaction.getType())) {
                    commentReaction.setType(newReactionType);
                    commentReaction = commentReactionRepository.save(commentReaction);
                    message = "Update comment reaction successfully";
                } else {
                    message = "Comment reaction unchanged";
                }
            } else {
                commentReactionRepository.delete(commentReaction);
                message = "Delete comment reaction successfully";
                commentReaction = null;
            }
        } else {
            if(newReactionType == null)  {
                message = "User does not have any reaction";
            } else {
                commentReaction = commentReactionRepository.save(
                        CommentReaction.builder()
                                .commentId(commentReactionDto.getCommentId())
                                .userId(commentReactionDto.getUserId())
                                .type(commentReactionDto.getType())
                                .build());
                message = "Create comment reaction successfully";
            }
        }

        return ApiTemplateResponse.<CommentReactionDto>builder()
                .message(message)
                .data(commentReaction != null ? commentReactionMapper.toDto(commentReaction) : null)
                .build();
    }

    @Override
    public void deleteReactionByCommentId(String commentId) {
        commentReactionRepository.deleteByCommentId(commentId);
    }
}
