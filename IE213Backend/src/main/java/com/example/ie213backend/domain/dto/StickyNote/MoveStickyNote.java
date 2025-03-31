package com.example.ie213backend.domain.dto.StickyNote;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MoveStickyNote {
    @Id
    private String id;
    private PositionDTO position;
    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PositionDTO {
        private int x;
        private int y;
    }
}
