package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.UserPlans;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface UserPlansRepository extends MongoRepository<UserPlans, String> {
    List<UserPlans> findByExpiresAtBetweenAndActiveAndNotified(LocalDateTime expiresAtAfter, LocalDateTime expiresAtBefore, boolean active, boolean notified);

    List<UserPlans> findByExpiresAtBeforeAndActive(LocalDateTime expiresAtBefore, boolean active);
}
