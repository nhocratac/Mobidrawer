package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.UserPlans;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserPlansRepository extends MongoRepository<UserPlans, String> {
}
