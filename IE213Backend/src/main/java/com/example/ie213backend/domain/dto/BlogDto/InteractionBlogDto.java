package com.example.ie213backend.domain.dto.BlogDto;

import com.example.ie213backend.domain.InteractionAction;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
// The interacting user is taken from the JWT, never from the body; a legacy "owner" field is ignored.
@JsonIgnoreProperties(ignoreUnknown = true)
public class InteractionBlogDto {
    @NotNull(message = "Action not blank")
    private InteractionAction action;

    private String blogId;
}
