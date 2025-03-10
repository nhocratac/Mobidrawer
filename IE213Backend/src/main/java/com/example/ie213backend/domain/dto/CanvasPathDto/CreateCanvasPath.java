package com.example.ie213backend.domain.dto.CanvasPathDto;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.bson.types.ObjectId;

import java.util.List;

public class CreateCanvasPath {
    private String color ;
    private float thickness ;
    private float opacity;
    private List<CanvasPathDto.CoordinateDto> paths;
    private ObjectId owner;

    @Data
    @AllArgsConstructor
    public static class CoordinateDto {
        private float x ;
        private float y ;
    }
}
