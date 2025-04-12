package com.example.ie213backend.domain.dto.BlogDto;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Interaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.time.Instant;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BlogDto {
    private String id;
    private String title;
    private String description;
    private String thumbnail;
    private List<String> keywords;
    private String content;
    private Boolean isPublished;
    private UserDto owner;
    private String slug;

    private List<Interaction> interactions;
    private Page<CommentDto> comments;

    private Instant createdAt;
    private Instant updatedAt;
}
