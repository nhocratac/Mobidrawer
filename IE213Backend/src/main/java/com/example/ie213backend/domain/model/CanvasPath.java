package com.example.ie213backend.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@AllArgsConstructor
@Document(collection = "canvasPaths")
public class CanvasPath {
    @Id
    private ObjectId id;

    private String color ;
    private float thickness ;
    private float opacity;
    private List<Coordinate> paths;

    @Data
    @AllArgsConstructor
    public static class Coordinate {
        private float x ;
        private float y ;
    }
}
