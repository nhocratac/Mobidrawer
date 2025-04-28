package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CommentReactInfoDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.CommentDto.UpdateCommentDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Comment;
import com.example.ie213backend.mapper.CommentMapper;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.repository.CommentRepository;
import com.example.ie213backend.service.BlogService;
import com.example.ie213backend.service.CommentReactionService;
import com.example.ie213backend.service.CommentService;
import com.example.ie213backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.Optional;


@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {
    private final CommentRepository commentRepository;
    private final UserService userService;
    private final BlogService blogservice;
    private final CommentMapper commentMapper;
    private final UserMapper userMapper;
    private final CommentReactionService commentReactionService;

    private static final int defaultSubCommentsSize = 3;
    private static final Pageable defaultSubCommentPageable = PageRequest.of(0, defaultSubCommentsSize, Sort.by("createdAt").descending());

    private CommentDto convertToDto(Comment comment, String currUserId, Pageable pageable) {
        Optional<String> currentUserId = Optional.ofNullable(currUserId);
        CommentDto commentDto = commentMapper.toDto(comment);
        UserDto owner = userMapper.toDto(userService.getUserById(comment.getUserId()));
        Page<CommentDto> replies = getSubComments(comment.getId(), currUserId, pageable);
        commentDto.setOwner(owner);
        commentDto.setReplies(replies);

        CommentReactInfoDto reactInfoDto = commentReactionService.getCommentReactInfo(comment.getId(), currUserId);
        commentDto.setLikeCount(reactInfoDto.getLikeCount());
        commentDto.setDislikeCount(reactInfoDto.getDislikeCount());

        currentUserId.ifPresent(n -> {
            commentDto.setCurrentUserReaction(reactInfoDto.getCurrentUserReaction());
        });

        return commentDto;
    }

    @Override
    public CommentDto createComment(CreateCommentDto createCommentDto) {
        userService.getUserById(createCommentDto.getUserId());
        blogservice.getBlogById(createCommentDto.getBlogId());
        Comment comment = commentMapper.toEntity(createCommentDto);

        return convertToDto(commentRepository.save(comment), createCommentDto.getUserId(), defaultSubCommentPageable);
    }

    @Override
    public CommentDto updateComment(UpdateCommentDto updateCommentDto) {
        Comment comment = getCommentById(updateCommentDto.getCommentId());
        if (!comment.getUserId().equals(updateCommentDto.getCurrentUserId())) {
            throw new IllegalArgumentException("You are not allowed to update this comment");
        }
        comment.setContent(updateCommentDto.getContent());
        comment.setEdited(true);

        return convertToDto(commentRepository.save(comment), updateCommentDto.getCurrentUserId(), defaultSubCommentPageable);
    }

    @Override
    public void deleteComment(String commentId, String userId) {
        commentRepository.findByIdAndUserId(commentId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found or you dont have permission"));

        deepDelete(commentId);
    }

    private void deepDelete(String commentId) {
        commentRepository.findById(commentId).ifPresent(comment -> {
            commentRepository.deleteById(commentId);
            commentReactionService.deleteReactionByCommentId(commentId);
            commentRepository.findByRepliedId(commentId).forEach(reply -> deepDelete(reply.getId()));
        });
    }

    @Override
    public Page<CommentDto> getCommentsByBlogId(String blogId, String currUserId, Pageable pageable) {
        return commentRepository.findByBlogIdAndParentComment(blogId, true, pageable)
                .map(n -> convertToDto(n, currUserId, defaultSubCommentPageable));
    }

    @Override
    public Page<CommentDto> getSubComments(String commentId, String currUserId, Pageable pageable) {
        getCommentById(commentId);

        return commentRepository.findByRepliedId(commentId, pageable)
                .map(n -> convertToDto(n, currUserId, defaultSubCommentPageable));
    }

    @Override
    public Comment getCommentById(String commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found with id: " + commentId));
    }
}
