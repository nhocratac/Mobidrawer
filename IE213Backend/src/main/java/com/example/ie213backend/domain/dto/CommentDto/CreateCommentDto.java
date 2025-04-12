package com.example.ie213backend.domain.dto.CommentDto;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
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

    @NotBlank(message = "Owner not blank")
    private String owner;

    @NotBlank(message = "BlogId not blank")
    private String blogId;

    private String parentCommentId;
}
