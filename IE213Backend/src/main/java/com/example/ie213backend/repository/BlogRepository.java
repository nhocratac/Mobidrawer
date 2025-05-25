package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Blog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BlogRepository extends MongoRepository<Blog, String> {
    Page<Blog> findByOwnerAndIsPublished(String owner, boolean isPublished, Pageable pageable);
    Page<Blog> findByIsPublished(boolean isPublished, Pageable pageable);
}
