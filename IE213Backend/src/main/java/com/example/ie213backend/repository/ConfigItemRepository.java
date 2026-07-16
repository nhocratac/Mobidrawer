package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.ConfigItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ConfigItemRepository extends MongoRepository<ConfigItem, String> {
    Optional<ConfigItem> findByKey(String key);
}
