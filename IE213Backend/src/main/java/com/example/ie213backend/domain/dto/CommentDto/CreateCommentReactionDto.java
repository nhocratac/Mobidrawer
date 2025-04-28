package com.example.ie213backend.domain.dto.CommentDto;

import com.example.ie213backend.domain.ReactionType;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CreateCommentReactionDto {
    @NotBlank(message = "commentId not blank")
    private String commentId;

    @NotBlank(message = "userId not blank")
    private String userId;

    private ReactionType type;
}
