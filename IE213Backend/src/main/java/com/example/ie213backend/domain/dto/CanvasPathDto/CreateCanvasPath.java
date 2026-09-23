package com.example.ie213backend.domain.dto.CanvasPathDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.bson.types.ObjectId;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateCanvasPath {
    private String color ;

    @NotNull(message = "vui lòng cung cấp độ dày") private float thickness ;

    @NotNull(message = "vui lòng cung cấp độ trong suốt") private float opacity;

    @NotEmpty(message = "vui lòng cung cấp paths")
    private List<CoordinateDto> paths;

    @NotBlank( message = "vui lòng cung cấp boardId") String boardId;

    // Client-generated correlation id (the stroke's localId). Not persisted;
    // echoed back on /topic/draw/board/{boardId} so the drawing tab can
    // reconcile its optimistic stroke with the saved one.
    private String clientId;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CoordinateDto {
        private float x ;
        private float y ;
    }
}
