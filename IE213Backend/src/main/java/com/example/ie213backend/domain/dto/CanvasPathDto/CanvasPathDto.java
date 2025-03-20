package com.example.ie213backend.domain.dto.CanvasPathDto;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.data.annotation.Id;

import java.util.List;

@Data
public class CanvasPathDto {
    @Id
    private String id;

    private String color ;
    private float thickness ;
    private float opacity;
    private List<CanvasPathDto.CoordinateDto> paths;

    private String owner;
    private String boardId;

    @Data
    @AllArgsConstructor
    public static class CoordinateDto {
        private float x ;
        private float y ;
    }
}
