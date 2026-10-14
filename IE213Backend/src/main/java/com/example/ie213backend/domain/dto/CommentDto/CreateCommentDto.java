package com.example.ie213backend.domain.dto.CommentDto;

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
// The author is taken from the JWT, never from the body; a legacy "userId" field is ignored.
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateCommentDto {
    @NotBlank(message = "Content not blank")
    private String content;
    private boolean parentComment;

    @NotBlank(message = "blogId not blank")
    private String blogId;

    private String repliedId = null;
}
