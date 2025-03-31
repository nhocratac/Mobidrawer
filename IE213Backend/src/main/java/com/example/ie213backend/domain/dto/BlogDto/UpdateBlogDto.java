package com.example.ie213backend.domain.dto.BlogDto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class UpdateBlogDto {
    private String title;
    private String thumbnail;
    private List<String> keywords;
    private String description;
    private String content;
    private Boolean isPublished;
}
