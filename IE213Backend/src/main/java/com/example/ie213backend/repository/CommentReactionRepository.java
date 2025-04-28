package com.example.ie213backend.repository;

import com.example.ie213backend.domain.ReactionType;
import com.example.ie213backend.domain.model.CommentReaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CommentReactionRepository extends MongoRepository<CommentReaction, String> {
    int countByCommentIdAndType(String commentId, ReactionType type);
    Optional<CommentReaction> findByUserIdAndCommentId(String userId, String commentId);

    void deleteByCommentId(String commentId);
}
