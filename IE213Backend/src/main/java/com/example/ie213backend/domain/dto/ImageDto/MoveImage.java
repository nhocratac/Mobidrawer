package com.example.ie213backend.domain.dto.ImageDto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
public class MoveImage {

    private  String id;

    private Position position;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Position {
        private int x;
        private int y;
    }
}
