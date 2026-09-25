package com.example.ie213backend.domain.dto.CommentDto;

import com.example.ie213backend.domain.ReactionType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
// The reacting user is taken from the JWT, never from the body; a legacy "userId" field is ignored.
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateCommentReactionDto {
    @NotBlank(message = "commentId not blank")
    private String commentId;

    private ReactionType type;
}
