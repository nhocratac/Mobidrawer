package com.example.ie213backend.domain.model;


import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "stickyNote")
public class StickyNote {

    @Id
    private String id;

    private String text;

    private Size size;

    private  Position position;

    private String color ;

    @Field(targetType = FieldType.OBJECT_ID)
    private String owner;
    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    @LastModifiedDate
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonSerialize(using = LocalDateTimeSerializer.class)
    @JsonDeserialize(using = LocalDateTimeDeserializer.class)
    private LocalDateTime updateAt;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Size {
        private int width;
        private int height;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Position {
        private int x;
        private int y;
    }
}
