package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateCanvasPath;
import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateMultipleCanvasPaths;
import com.example.ie213backend.domain.model.CanvasPath;

import java.util.List;

public interface CanvasPathService {
    CanvasPath createCanvas(CanvasPath canvas);
    void deleteCanvas(String id, String boardId, String userId);
    List<CanvasPath> updateMultipleCanvasPaths(UpdateMultipleCanvasPaths updatePaths, String boardId, String userId);
}
