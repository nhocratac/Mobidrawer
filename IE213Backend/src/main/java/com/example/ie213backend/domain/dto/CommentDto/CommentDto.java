package com.example.ie213backend.domain.dto.CommentDto;

import com.example.ie213backend.domain.ReactionType;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Interaction;
import com.fasterxml.jackson.annotation.JsonProperty;
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
public class CommentDto {
    private String id;
    private String content;
    private boolean parentComment;
    private boolean edited;
    private Instant createdAt;
    private Instant updatedAt;

    private UserDto owner;
    private Page<CommentDto> replies;
    private int likeCount;
    private int dislikeCount;
    private ReactionType currentUserReaction;
}
