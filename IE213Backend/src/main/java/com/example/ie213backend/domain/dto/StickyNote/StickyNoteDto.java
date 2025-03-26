package com.example.ie213backend.domain.dto.StickyNote;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StickyNoteDto {
    @Id
    private String id;

    private String text;

    private SizeDTO size;

    private PositionDTO position;

    private String color ;

    @Field(targetType = FieldType.OBJECT_ID)
    private String owner;

    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateAt;

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
