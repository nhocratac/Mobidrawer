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
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {
    private final BoardRepository boardRepository;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    @Override
    public Notification sendRequestJoinBoard(String userId, String boardId) {
        Optional<Board> board = boardRepository.findById(boardId);
        Optional<User> user = userRepository.findById(userId);
        board.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Board not found"));
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

        Notification.Receiver receiver = Notification.Receiver.builder()
                .id(owner.get().getId())
                .read(false)
                .build();
        notification.setReceivers(List.of(receiver));

        return notificationRepository.save(notification); // giả sử bạn có NotificationRepository
    }

    public List<Notification> getNotifications(String userId) {
        return notificationRepository.findByReceivers_Id(userId, Sort.by(Sort.Direction.DESC, "createdAt"));
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

        Notification.Receiver receiver = Notification.Receiver.builder()
                .id(user.getId())
                .read(false)
                .build();
        notification2.setReceivers(List.of(receiver));
        notificationRepository.save(notification2);
    }

    @Override
    public void sendNotification(String title, String content, List<String> receivers) {
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setBody(content);

        List<Notification.Receiver> receiverList = receivers.stream().map(
                receiver ->
                        Notification.Receiver.builder()
                                .id(receiver)
                                .read(false)
                                .build()
        ).collect(Collectors.toList());

        notification.setReceivers(receiverList);
        notificationRepository.save(notification);
    }

    @Override
    public List<Notification> markNotificationAsRead(String userId, List<String> notificationIds) {
        return notificationIds.stream().map(notificationId -> {
            Notification notification = notificationRepository.findById(notificationId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

            boolean found = false;
            for (Notification.Receiver receiver : notification.getReceivers()) {
                if (receiver.getId().equals(userId)) {
                    receiver.setRead(true);
                    found = true;
                    break; // Thoát sớm khi tìm thấy
                }
            }

            if (!found) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User is not a receiver of this notification");
            }

            return notificationRepository.save(notification);
        }).toList();
    }
}
