package com.example.ie213backend.service;

import com.example.ie213backend.domain.model.CanvasPath;

public interface CanvasPathService {
    CanvasPath CreateCanvas(CanvasPath canvas, String owner);
    public void deleteCanvas(String id, String userId);
}
