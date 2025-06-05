package com.example.ie213backend.domain.dto.ImageDto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateImage {
    private String alt ;

    private String url ;

    private Size size;

    private Position position;

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
