package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.CanvasPathDto.UpdateCanvasPath;
import com.example.ie213backend.domain.model.CanvasPath;

import java.util.List;

public interface CanvasPathService {
    CanvasPath CreateCanvas(CanvasPath canvas, String owner);
    public void deleteCanvas(String id, String userId);
    public CanvasPath updateCanvas(UpdateCanvasPath path, String userId);
}
