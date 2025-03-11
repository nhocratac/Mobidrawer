package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.BlogDto.CreateBlogDto;
import com.example.ie213backend.domain.dto.BlogDto.InteractionBlogDto;
import com.example.ie213backend.service.BlogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(path = "${api.prefix}/blogs")
@RequiredArgsConstructor
@Slf4j
public class BlogController {
    private final BlogService blogService;

    @PostMapping
    public ResponseEntity<BlogDto> createBlog(@RequestBody @Valid CreateBlogDto createBlogDto) {
        BlogDto blog = blogService.createBlog(createBlogDto);

        return ResponseEntity.ok(blog);
    }

    @PostMapping("/{blogId}/interaction")
    public ResponseEntity<BlogDto> createOrRemoveInteraction(@PathVariable String blogId,
                                                             @RequestBody @Valid InteractionBlogDto interactionBlogDto) {
        interactionBlogDto.setBlogId(blogId);
        BlogDto blog = blogService.createOrRemoveInteraction(interactionBlogDto);

        return ResponseEntity.ok(blog);
    }
}
