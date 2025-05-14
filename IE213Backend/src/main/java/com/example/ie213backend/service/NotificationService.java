package com.example.ie213backend.service;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.Notification;
import com.example.ie213backend.domain.model.User;

import java.util.List;

public interface NotificationService {
    Notification sendRequestJoinBoard (String userId, String boardId) ;
    List<Notification> getNotifications(String userId) ;
    void joinBoardSuccessful(String ownerId, Board board, User user);
}
