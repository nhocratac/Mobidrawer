package com.example.ie213backend.domain.dto.ImageDto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
public class ResizeImage {
    private  String id;

    private  Size size;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Size {
        private int width;
        private int height;
    }

}
