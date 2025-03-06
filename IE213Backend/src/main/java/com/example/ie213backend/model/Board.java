package com.example.ie213backend.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@Document(collection = "boards")
public class Board {
    @Id
    private String _id;
    private String name;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonSerialize(using = LocalDateTimeSerializer.class)
    @JsonDeserialize(using = LocalDateTimeDeserializer.class)
    private LocalDateTime lastOpened;

    private String owner;
    private String type;
    private String description;
    private Option option;
    private List<Permission> permissions;
    private List<CanvasPath> canvasPaths;

    @Data
    @AllArgsConstructor
    public static class Option {
        private boolean grid;
        private String backgroundColor = "#FFFFFF";
    }

    @Data
    @AllArgsConstructor
    public static class Permission {
        private String memberId;
        private String role;
    }

    @Data
    @AllArgsConstructor
    public static class CanvasPath {

        @Id
        private String id;

        private String color ;
        private String thickness ;
        private String opacity;
        private List<Path> paths;

        @Data
        @AllArgsConstructor
        public static class Path {
            private float x ;
            private float y ;
        }
    }
}
