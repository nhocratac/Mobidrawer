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
public class CreateCommentDto {
    @NotBlank(message = "Content not blank")
    private String content;
    private boolean parentComment;

    @NotBlank(message = "userId not blank")
    private String userId;

    @NotBlank(message = "blogId not blank")
    private String blogId;

    private String repliedId = null;
}
