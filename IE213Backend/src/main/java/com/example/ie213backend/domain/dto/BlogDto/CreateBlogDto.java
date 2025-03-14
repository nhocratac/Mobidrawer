package com.example.ie213backend.domain.dto.BlogDto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CreateBlogDto {
    @NotBlank(message = "Title not blank!")
    private String title;

    @NotBlank(message = "Description not blank!")
    private String description;

    @NotBlank(message = "Thumbnail not blank!")
    private String thumbnail;

    @NotBlank(message = "Content not blank!")
    private String content;

    @NotBlank(message = "Owner not blank!")
    private String owner;
}
