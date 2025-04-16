package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.BlogDto.CreateBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.InteractionBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.UpdateBlogDto;
import com.example.ie213backend.service.BlogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(path = "${api.prefix}/blogs")
@RequiredArgsConstructor
@Slf4j
public class BlogController {
    private final BlogService blogService;

    @GetMapping
    public ResponseEntity<Page<BlogDto>> getAllBlogs(@RequestParam(name = "page") int page) {
        Pageable pageable = PageRequest.of(page, 6, Sort.by("createdAt").descending());
        Page<BlogDto> blogDtos = blogService.getAllBlogs(pageable);

        return ResponseEntity.ok(blogDtos);
    }

    @PostMapping
    public ResponseEntity<BlogDto> createBlog(@RequestBody @Valid CreateBlogDto createBlogDto) {
        BlogDto blog = blogService.createBlog(createBlogDto);

        return ResponseEntity.ok(blog);
    }

    @GetMapping("/{blogId}")
    public ResponseEntity<BlogDto> getBlogById(@PathVariable String blogId) {
        BlogDto blog = blogService.getBlogById(blogId);

        return ResponseEntity.ok(blog);
    }

    @PutMapping("/{blogId}")
    public ResponseEntity<BlogDto> updateBlog(@PathVariable String blogId, @RequestBody UpdateBlogDto updateBlogDto) {
        BlogDto blog = blogService.updateBlog(updateBlogDto, blogId);

        return ResponseEntity.ok(blog);
    }

    @DeleteMapping("/{blogId}")
    public void deleteBlog(@PathVariable String blogId) {
        blogService.deleteBlog(blogId);
    }

    @GetMapping("/users/{userId}")
        public ResponseEntity<Page<BlogDto>> listBlogs(@PathVariable String userId,
                                                        @RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "10") int size,
                                                        @RequestParam(defaultValue = "false") boolean isPublished) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<BlogDto> blogDtos = blogService.listBlogByUserId(userId, isPublished, pageable);

        return ResponseEntity.ok(blogDtos);
    }

    @PostMapping("/{blogId}/interaction")
    public ResponseEntity<BlogDto> createOrRemoveInteraction(@PathVariable String blogId,
                                                             @RequestBody @Valid InteractionBlogDto interactionBlogDto) {
        interactionBlogDto.setBlogId(blogId);
        BlogDto blog = blogService.createOrRemoveInteraction(interactionBlogDto);

        return ResponseEntity.ok(blog);
    }
}
