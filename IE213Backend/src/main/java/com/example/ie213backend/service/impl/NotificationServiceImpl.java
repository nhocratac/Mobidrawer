package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.Notification;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.BoardRepository;
import com.example.ie213backend.repository.NotificationRepository;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl  implements NotificationService {
    private final BoardRepository boardRepository;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    @Override
    public Notification sendRequestJoinBoard(String userId, String boardId) {
        Optional<Board> board = boardRepository.findById(boardId);
        Optional<User> user = userRepository.findById(userId);
        board.orElseThrow( () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));
        Optional<User> owner = userRepository.findById(board.get().getOwner());

        if (user.isEmpty() || owner.isEmpty()) {
            throw new RuntimeException("Board or user not found");
        }

        emailService.sendRequestPermission(
                owner.get().getEmail(),
                user.get().getFirstName(),
                user.get().getLastName(),
                user.get().getEmail(),
                boardId
        );

        Notification notification = new Notification();
        notification.setTitle("Join Request");
        notification.setBody(user.get().getFirstName() + " " + user.get().getLastName() + " requested to join board " + board.get().getName());
        notification.setReceivers(List.of(owner.get().getId()));

        return notificationRepository.save(notification); // giả sử bạn có NotificationRepository
    }

    public List<Notification> getNotifications(String userId) {
        return notificationRepository.findAllByReceivers(userId);
    }

    public void joinBoardSuccessful(String ownerId, Board board, User user) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("Owner not found"));

        // Gửi email thông báo
        emailService.sendNotificationSuccessfullJoinBoard(
                user.getEmail(),
                owner.getFirstName(),
                owner.getLastName(),
                owner.getEmail(),
                board.getId(),
                board.getName()
        );

        Notification notification2 = new Notification();
        notification2.setTitle("Board joined successfully");
        notification2.setBody("You " + " joined the board " + board.getName());
        notification2.setReceivers(List.of(user.getId()));
        notificationRepository.save(notification2);
    }

    @Override
    public void sendNotification(String title, String content, List<String> receivers) {
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setBody(content);
        notification.setReceivers(receivers);
        notificationRepository.save(notification);
    }
}
