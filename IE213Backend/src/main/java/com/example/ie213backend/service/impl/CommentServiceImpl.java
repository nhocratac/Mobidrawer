package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CommentReactInfoDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.CommentDto.UpdateCommentDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Comment;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.configstore.ConfigKeys;
import com.example.ie213backend.configstore.ConfigService;
import com.example.ie213backend.mapper.CommentMapper;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.repository.CommentRepository;
import com.example.ie213backend.service.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
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
    private final NotificationService notificationService;
    private final ConfigService configService;

    private Pageable subCommentPageable() {
        return PageRequest.of(0, configService.getInt(ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE), Sort.by("createdAt").descending());
    }

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
    public CommentDto createComment(CreateCommentDto createCommentDto, UserDto actor) {
        String userId = actor.getId();
        User owner = userService.getUserById(userId);
        // Blog chưa publish -> 404 với người ngoài (cùng quy tắc với GET /blogs/{id})
        BlogDto blogDto = blogservice.getBlogById(createCommentDto.getBlogId(), actor);
        Comment comment = commentMapper.toEntity(createCommentDto);
        comment.setUserId(userId);

        if(comment.getRepliedId() != null) {
            Comment repliedComment = getCommentById(comment.getRepliedId());

            if (!repliedComment.getUserId().equals(userId)) {
                String name = owner.getFirstName() + " " + owner.getLastName();

                notificationService.sendNotification(name + " đã phản hồi comment của bạn!",
                        name + " đã phản hồi comment của bạn trong bài viết " + blogDto.getTitle(),
                        List.of(repliedComment.getUserId())
                );
            }

        }

        return convertToDto(commentRepository.save(comment), userId, subCommentPageable());
    }

    @Override
    public CommentDto updateComment(UpdateCommentDto updateCommentDto, String userId) {
        Comment comment = getCommentById(updateCommentDto.getCommentId());
        if (!comment.getUserId().equals(userId)) {
            throw new IllegalArgumentException("You are not allowed to update this comment");
        }
        comment.setContent(updateCommentDto.getContent());
        comment.setEdited(true);

        return convertToDto(commentRepository.save(comment), userId, subCommentPageable());
    }

    @Override
    public void deleteComment(String commentId, String userId) {
        commentRepository.findByIdAndUserId(commentId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found or you dont have permission"));

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
    public Page<CommentDto> getCommentsByBlogId(String blogId, String currUserId, UserDto viewer, Pageable pageable) {
        blogservice.getBlogById(blogId, viewer); // 404 nếu blog chưa publish và viewer không phải owner/ADMIN
        return commentRepository.findByBlogIdAndParentComment(blogId, true, pageable)
                .map(n -> convertToDto(n, currUserId, subCommentPageable()));
    }

    @Override
    public Page<CommentDto> getSubComments(String commentId, String currUserId, Pageable pageable) {
        getCommentById(commentId);

        return commentRepository.findByRepliedId(commentId, pageable)
                .map(n -> convertToDto(n, currUserId, subCommentPageable()));
    }

    @Override
    public Comment getCommentById(String commentId) {
        return commentRepository.findById(commentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found with id: " + commentId));
    }
}
