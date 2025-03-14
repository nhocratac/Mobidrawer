package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.BlogDto.CreateBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.InteractionBlogDto;

import java.util.List;

public interface BlogService {
    List<BlogDto> getAllBLog();
    BlogDto getBlogById(String blogId);
    BlogDto createBlog(CreateBlogDto createBlogDto);
    BlogDto createOrRemoveInteraction(InteractionBlogDto interactionBlogDto);
}
