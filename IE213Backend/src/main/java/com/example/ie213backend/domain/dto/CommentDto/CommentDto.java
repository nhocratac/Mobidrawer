package com.example.ie213backend.domain.dto.CommentDto;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Interaction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommentDto {
    private String id;
    private String content;
    private UserDto owner;
    private List<Interaction> interactions;
    private String blogId;
    private String parentCommentId;
    private Instant createdAt;
}
