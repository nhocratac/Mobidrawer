package com.example.ie213backend.domain.dto.CanvasPathDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateMultipleCanvasPaths {
    @NotEmpty
    private List<UpdateCanvasPath> paths;
}
