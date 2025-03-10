package com.example.ie213backend.domain.dto.BoardDto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class CreateBoard {
    private String name;
    private String owner;
    private String type;
    private String description;
    private String thumbnail;
}
