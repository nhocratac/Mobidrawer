package com.example.ie213backend.domain.model;

import com.example.ie213backend.domain.InteractionAction;
import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Interaction {
    private String owner;
    private InteractionAction action;
}
