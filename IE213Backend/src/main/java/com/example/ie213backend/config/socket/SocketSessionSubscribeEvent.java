package com.example.ie213backend.config.socket;

@Component
public class SessionSubscribeEvent implements
        ApplicationListener<SessionConnectEvent>,
        ApplicationListener<SessionSubscribeEvent>,
        ApplicationListener<SessionDisconnectEvent> {

    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, Map<String, String>> boardUsers = new HashMap<>();

    public WebSocketEventListener(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void onApplicationEvent(SessionConnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        System.out.println("Client connected - sessionId: " + sessionId);
    }

    @Override
    public void onApplicationEvent(SessionSubscribeEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String destination = headerAccessor.getDestination();
        String sessionId = headerAccessor.getSessionId();
        String userId = "anonymous_" + sessionId;

        if (destination != null && destination.startsWith("/topic/board/")) {
            String boardId = destination.substring("/topic/board/".length());
            boardUsers.computeIfAbsent(boardId, k -> new HashMap<>()).put(userId, sessionId);
            System.out.println("User " + userId + " joined board " + boardId);
            messagingTemplate.convertAndSend("/topic/board/" + boardId,
                    "User " + userId + " has joined board " + boardId);
        }
    }

    @Override
    public void onApplicationEvent(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        boardUsers.forEach((boardId, users) -> {
            users.entrySet().removeIf(entry -> {
                if (entry.getValue().equals(sessionId)) {
                    String userId = entry.getKey();
                    System.out.println("User " + userId + " left board " + boardId);
                    messagingTemplate.convertAndSend("/topic/board/" + boardId,
                            "User " + userId + " has left board " + boardId);
                    return true;
                }
                return false;
            });
        });
    }
}