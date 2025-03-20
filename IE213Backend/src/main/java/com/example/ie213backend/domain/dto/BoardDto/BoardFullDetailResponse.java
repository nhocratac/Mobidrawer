package com.example.ie213backend.domain.dto.BoardDto;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class BoardFullDetailResponse extends Board {
    private List<CanvasPath> canvasPaths;
}
