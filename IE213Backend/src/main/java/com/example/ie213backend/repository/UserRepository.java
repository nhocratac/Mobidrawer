package com.example.ie213backend.repository;

import com.example.ie213backend.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    User findOneByEmail(String email);

}