package com.example.ie213backend.domain.dto.BoardDto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class BoardDTO {
    private String id;
    private String name;
    private String owner;
    private String type;
    private String description;
    private OptionDTO option;
    private String thumbnail;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateAt;

    private List<PermissionDTO> permissions;
    private List<String> canvasPaths;

    @Data
    @AllArgsConstructor
    public static class OptionDTO {
        private boolean grid;
        private String backgroundColor;
    }

    @Data
    @AllArgsConstructor
    public static class PermissionDTO {
        private String memberId;
        private String role;
    }
}
