package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Comment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CommentRepository extends MongoRepository<Comment, String> {
    Page<Comment> findByBlogIdAndParentComment(String blogId, boolean parentComment, Pageable pageable);
    Page<Comment> findByRepliedId(String repliedId, Pageable pageable);
    List<Comment> findByRepliedId(String repliedId);
    Optional<Comment> findByIdAndUserId(String id, String userId);
}
