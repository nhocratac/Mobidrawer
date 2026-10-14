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
// The editor is taken from the JWT, never from the body; a legacy "currentUserId" field is ignored.
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateCommentDto {
    @NotBlank
    private String commentId;
    @NotBlank
    private String content;
}
