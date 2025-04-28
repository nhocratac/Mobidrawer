package com.example.ie213backend.domain.dto.CommentDto;

import com.example.ie213backend.domain.ReactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CommentReactionDto {

    private String id;

    @NotBlank(message = "commentId not blank")
    private String commentId;

    @NotBlank(message = "userId not blank")
    private String userId;

    @NotNull(message = "reactionType not null")
    private ReactionType type;

    private Instant createdAt;
    private Instant updatedAt;
}
