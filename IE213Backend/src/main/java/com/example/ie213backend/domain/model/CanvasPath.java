package com.example.ie213backend.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.util.List;

@Data
@AllArgsConstructor
@Document(collection = "canvasPaths")
public class CanvasPath {
    @Id
    private String id;

    private String color ;
    private float thickness ;
    private float opacity;
    private List<Coordinate> paths;

    @Field(targetType = FieldType.OBJECT_ID)
    private String ownerId;

    @Data
    @AllArgsConstructor
    public static class Coordinate {
        private float x ;
        private float y ;
    }
}
