package com.example.ie213backend.service;

import com.example.ie213backend.domain.model.Image;

import java.util.List;

public interface ImageService {
    Image createImage(Image image);
    Image updateImagePosition(Image image);
    Image updateImageSize(Image image);
    void deleteImage(String id, String boardId, String owner);
    List<Image> createImages(List<Image> images);
}
