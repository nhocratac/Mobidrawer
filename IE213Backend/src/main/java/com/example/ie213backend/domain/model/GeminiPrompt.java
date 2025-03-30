package com.example.ie213backend.domain.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class GeminiPrompt {
    @NotBlank(message = "Prompt không được để trống")
    private String prompt;
}
