package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.BlogDto.CreateBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.InteractionBlogDto;
import com.example.ie213backend.domain.model.Blog;
import com.example.ie213backend.domain.model.Interaction;
import com.example.ie213backend.mapper.BlogMapper;
import com.example.ie213backend.repository.BlogRepository;
import com.example.ie213backend.service.BlogService;
import com.example.ie213backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BlogServiceImpl implements BlogService {
    private final BlogRepository blogRepository;
    private final UserService userService;
    private final BlogMapper blogMapper;

    @Override
    public List<BlogDto> getAllBLog() {
        return List.of();
    }

    @Override
    public BlogDto getBlogById(String blogId) {
        return blogMapper.toDto(blogRepository.findById(blogId)
                .orElseThrow(() -> new IllegalArgumentException("Blog not found with id: " + blogId)));
    }

    @Override
    public BlogDto createBlog(CreateBlogDto createBlogDto) {
        userService.getUserById(createBlogDto.getOwner());

        return blogMapper.toDto(blogRepository.save(blogMapper.toEntity(createBlogDto)));
    }

    @Override
    public BlogDto createOrRemoveInteraction(InteractionBlogDto interactionBlogDto) {
        Blog blog = blogMapper.toEntity(getBlogById(interactionBlogDto.getBlogId()));
        Interaction interaction = new Interaction(interactionBlogDto.getOwner(), interactionBlogDto.getAction());
        List<Interaction> interactions = new ArrayList<>(Optional.ofNullable(blog.getInteractions())
                .orElse(new ArrayList<>()));

        boolean exists = interactions.stream()
                .anyMatch(i -> i.getOwner().equals(interaction.getOwner()));

        if(exists) {
            interactions.removeIf(i -> i.getOwner().equals(interaction.getOwner()));
        } else {
            interactions.add(interaction);
        }
        blog.setInteractions(interactions);

        return blogMapper.toDto(blogRepository.save(blog));
    }

}
