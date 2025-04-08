package com.example.ie213backend.domain.dto.StickyNote;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LockStickyNote {
    @Id
    private String id;
}
