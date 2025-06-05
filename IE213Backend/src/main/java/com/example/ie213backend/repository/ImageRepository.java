package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Image;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ImageRepository extends MongoRepository<Image, String> {

}
