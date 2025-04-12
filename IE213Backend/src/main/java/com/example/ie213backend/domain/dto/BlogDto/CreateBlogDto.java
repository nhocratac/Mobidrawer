package com.example.ie213backend.domain.dto.BlogDto;

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
public class CreateBlogDto {
    private String title;

    private String thumbnail;

    private String content;

    @NotBlank(message = "Owner not blank!")
    private String owner;

    @NotNull(message = "isPublished không được null")
    private Boolean isPublished;
}
