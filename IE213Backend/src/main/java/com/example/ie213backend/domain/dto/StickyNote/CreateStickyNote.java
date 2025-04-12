package com.example.ie213backend.domain.dto.StickyNote;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateStickyNote {


    private String text;

    private SizeDTO size;

    private PositionDTO position;

    private String color ;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class SizeDTO {
        private int width;
        private int height;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PositionDTO {
        private int x;
        private int y;
    }
}
