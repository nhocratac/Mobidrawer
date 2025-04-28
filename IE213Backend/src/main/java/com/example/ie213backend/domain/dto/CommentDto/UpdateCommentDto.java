package com.example.ie213backend.domain.dto.CommentDto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UpdateCommentDto {
    @NotBlank
    private String commentId;
    @NotBlank
    private String currentUserId;
    @NotBlank
    private String content;
}
