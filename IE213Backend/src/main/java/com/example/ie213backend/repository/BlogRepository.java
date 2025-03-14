package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Blog;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BlogRepository extends MongoRepository<Blog, String> {
}
