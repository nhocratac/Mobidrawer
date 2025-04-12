package com.example.ie213backend.domain.dto.CanvasPathDto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class UpdateCanvasPath {
    @NotBlank(message = "ID không được trống")
    private String id;

    private String color;

    @NotNull(message = "Vui lòng cung cấp độ dày")
    private float thickness;

    @NotNull(message = "Vui lòng cung cấp độ trong suốt")
    private float opacity;

    @NotEmpty(message = "Vui lòng cung cấp paths")
    private List<CoordinateDto> paths;

    @NotBlank(message = "Vui lòng cung cấp boardId")
    private String boardId;

    @NotBlank(message = "Vui lòng cung cấp owner") // Thêm validate owner
    private String owner;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CoordinateDto {
        private float x;
        private float y;
    }
}