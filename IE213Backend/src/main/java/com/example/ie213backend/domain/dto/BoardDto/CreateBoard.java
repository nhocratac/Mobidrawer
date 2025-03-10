package com.example.ie213backend.domain.dto.BoardDto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateBoard {
        @NotBlank(message = "vui lòng nhập name" )private String name;
        @NotBlank(message = "vui lòng nhập owner" )private String owner;
        @NotBlank(message = "vui lòng nhập type" )private String type;
        @NotBlank(message = "vui lòng nhập description" )private String description;
        @NotBlank(message = "vui lòng nhập thumbnail" )private String thumbnail;

}
