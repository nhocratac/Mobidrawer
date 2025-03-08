package com.example.ie213backend.dto.BoardDto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.data.annotation.Id;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class CreateBoard {
    @Id
    private String id;

    @NotBlank(message = "vui lòng cung cấp tên")
    private String name;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd HH:mm:ss")
    @JsonSerialize(using = LocalDateTimeSerializer.class)
    @JsonDeserialize(using = LocalDateTimeDeserializer.class)
    private LocalDateTime lastOpened;

    @NotBlank(message = "vui lòng cung cấp chủ sở hữu")
    private String owner;
    private String type;
    private String description;
    private OptionDTO option;


    private List<PermissionDTO> permissionsDTO;

    @Data
    public static class OptionDTO {
        private boolean grid;
        private String backgroundColor;
    }

    @Data
    public static class PermissionDTO {
        private String memberId;
        private String role;
    }
}
