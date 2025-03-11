package com.example.ie213backend.domain.dto.CommentDto;

import com.example.ie213backend.domain.InteractionAction;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InteractionCommentDto {
    @NotBlank(message = "Owner not blank")
    private String owner;

    @NotNull(message = "Action not blank")
    private InteractionAction action;

    private String commentId;
}
