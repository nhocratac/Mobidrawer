package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.BlogDto.CreateBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.InteractionBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.UpdateBlogDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface BlogService {
    BlogDto getBlogById(String blogId);
    BlogDto createBlog(CreateBlogDto createBlogDto);
    BlogDto updateBlog(UpdateBlogDto updateBlogDto, String blogId);
    void deleteBlog(String blogId);
    Page<BlogDto> listBlogByUserId(String userId, boolean isPublished, Pageable pageable);
    BlogDto createOrRemoveInteraction(InteractionBlogDto interactionBlogDto);
    Page<BlogDto> getAllBlogs(Pageable pageable);
    List<BlogDto> getAllBlogsID();
}
