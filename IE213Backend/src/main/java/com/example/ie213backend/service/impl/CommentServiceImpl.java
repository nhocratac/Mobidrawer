package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.CommentDto.InteractionCommentDto;
import com.example.ie213backend.domain.model.Comment;
import com.example.ie213backend.domain.model.Interaction;
import com.example.ie213backend.mapper.CommentMapper;
import com.example.ie213backend.repository.CommentRepository;
import com.example.ie213backend.service.CommentService;
import com.example.ie213backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;


@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {
    private final CommentRepository commentRepository;
    private final UserService userService;
    private final CommentMapper commentMapper;

    @Override
    public CommentDto getCommentById(String commentId) {
        return commentMapper.toDto(commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Comment not found with id: " + commentId)));
    }

    @Override
    public Page<CommentDto> getCommentsByBlogId(String blogId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return commentRepository.findByBlogId(blogId, pageable).map(commentMapper::toDto);
    }

    @Override
    public CommentDto createComment(CreateCommentDto createCommentDto) {
        Comment comment = commentMapper.toEntity(createCommentDto);
        userService.getUserById(comment.getOwner());

        return commentMapper.toDto(commentRepository.save(comment));
    }

    @Override
    public CommentDto createOrRemoveInteraction(InteractionCommentDto interactionCommentDto) {
        Comment comment = commentMapper.toEntity(getCommentById(interactionCommentDto.getCommentId()));
        Interaction interaction = new Interaction(interactionCommentDto.getOwner(), interactionCommentDto.getAction());
        List<Interaction> interactions = new ArrayList<>(Optional.ofNullable(comment.getInteractions())
                .orElse(new ArrayList<>()));

        boolean exists = interactions.stream()
                .anyMatch(i -> i.getOwner().equals(interactionCommentDto.getOwner()));

        if (exists) {
            interactions.removeIf(i -> i.getOwner().equals(interaction.getOwner()));
        } else {
            interactions.add(interaction);
        }
        comment.setInteractions(interactions);

        return commentMapper.toDto(commentRepository.save(comment));
    }
}
