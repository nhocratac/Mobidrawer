package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findAllByReceivers(String receiverId);
}
