package com.example.ie213backend.domain.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
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
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "Templates")
public class Template {
    @Id
    private String id;

    private String title;

    private String description;

    @Field(targetType = FieldType.OBJECT_ID)
    private String owner;

    private String previewImageUrl;

    @JsonProperty("isPublic")
    private boolean isPublic;

    private List<CanvasPath> canvasPaths;
    private List<StickyNote> stickyNotes;
    private List<Image> images;


    @LastModifiedDate
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonSerialize(using = LocalDateTimeSerializer.class)
    @JsonDeserialize(using = LocalDateTimeDeserializer.class)
    private LocalDateTime updateAt;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CanvasPath {
        private float thickness;
        private String color;
        private float opacity;
        private List<Coordinate> paths;

        @Data
        @NoArgsConstructor
        @AllArgsConstructor
        public static class Coordinate {
            private float x ;
            private float y ;
        }
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class StickyNote {
        private String text;
        private Position position;
        private Size size;
        private String color;


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

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Image {
        private String alt;
        private Position position;
        private Size size;
        private String url;
        private String cloudinaryId;


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


}
