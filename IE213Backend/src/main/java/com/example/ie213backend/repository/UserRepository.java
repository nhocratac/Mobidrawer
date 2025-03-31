package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);

    @Query(
            value = "{'_id': ?0}",
            fields = "{'email': 1, 'firstName': 1, 'lastName': 1}"
    )
    Optional<User> getBaseInformation(String id);
}