package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.BlogDto.CreateBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.InteractionBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.UpdateBlogDto;
import com.example.ie213backend.domain.model.Blog;
import com.example.ie213backend.domain.model.Interaction;
import com.example.ie213backend.mapper.BlogMapper;
import com.example.ie213backend.repository.BlogRepository;
import com.example.ie213backend.service.BlogService;
import com.example.ie213backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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
    public BlogDto getBlogById(String blogId) {
        return blogMapper.toDto(blogRepository.findById(blogId)
                .orElseThrow(() -> new IllegalArgumentException("Blog not found with id: " + blogId)));
    }

    @Override
    public BlogDto createBlog(CreateBlogDto createBlogDto) {
        userService.getUserById(createBlogDto.getOwner());
        Blog blog = blogMapper.toEntity(createBlogDto);

        return blogMapper.toDto(blogRepository.save(blog));
    }

    @Override
    public BlogDto updateBlog(UpdateBlogDto updateBlogDto, String blogId) {
        Blog targetBlog = blogRepository.findById(blogId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy blog có id: " + blogId));

        Optional.ofNullable(updateBlogDto.getTitle()).ifPresent(targetBlog::setTitle);
        Optional.ofNullable(updateBlogDto.getDescription()).ifPresent(targetBlog::setDescription);
        Optional.ofNullable(updateBlogDto.getKeywords()).ifPresent(targetBlog::setKeywords);
        Optional.ofNullable(updateBlogDto.getThumbnail()).ifPresent(targetBlog::setThumbnail);
        Optional.ofNullable(updateBlogDto.getContent()).ifPresent(targetBlog::setContent);
        Optional.ofNullable(updateBlogDto.getIsPublished()).ifPresent(targetBlog::setIsPublished);
        Optional.ofNullable(updateBlogDto.getSlug()).ifPresent(targetBlog::setSlug);

        return blogMapper.toDto(blogRepository.save(targetBlog));
    }

    @Override
    public void deleteBlog(String blogId) {
        Blog blog = blogRepository.findById(blogId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy blog có id: " + blogId));

        blogRepository.delete(blog);
    }


    @Override
    public Page<BlogDto> listBlogByUserId(String userId, boolean isPublished, Pageable pageable) {
        return blogRepository.findByOwnerAndIsPublished(userId, isPublished, pageable)
                .map(blogMapper::toDto);
    }

    @Override
    public BlogDto createOrRemoveInteraction(InteractionBlogDto interactionBlogDto) {
        Blog blog = blogMapper.toEntity(getBlogById(interactionBlogDto.getBlogId()));
        Interaction interaction = new Interaction(interactionBlogDto.getOwner(), interactionBlogDto.getAction());
        List<Interaction> interactions = new ArrayList<>(Optional.ofNullable(blog.getInteractions())
                .orElse(new ArrayList<>()));

        boolean exists = interactions.stream()
                .anyMatch(i -> i.getOwner().equals(interaction.getOwner()));

        if (exists) {
            interactions.removeIf(i -> i.getOwner().equals(interaction.getOwner()));
        } else {
            interactions.add(interaction);
        }
        blog.setInteractions(interactions);

        return blogMapper.toDto(blogRepository.save(blog));
    }

    @Override
    public Page<BlogDto> getAllBlogs(Pageable pageable) {
        return blogRepository.findByIsPublished(true, pageable).map(blogMapper::toDto);
    }

    @Override
    public List<BlogDto> getAllBlogsID() {    return blogRepository.findAll()
            .stream() // Chuyển List<Blog> thành Stream<Blog>
            .map(blogMapper::toDto) // Ánh xạ Blog sang BlogDto
            .collect(Collectors.toList()); // Thu lại thành List<BlogDto>
    }
}
