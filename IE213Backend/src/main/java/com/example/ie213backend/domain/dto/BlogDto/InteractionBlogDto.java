package com.example.ie213backend.domain.dto.BlogDto;

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
public class InteractionBlogDto {
    @NotBlank(message = "Owner not blank")
    private String owner;

    @NotNull(message = "Action not blank")
    private InteractionAction action;

    private String blogId;
}
