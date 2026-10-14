package com.example.ie213backend.security;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Client-inbound STOMP authorization guard (SEC-3, M1).
 *
 * <p>SUBSCRIBE to a board topic requires the handshake session user
 * (session-attribute {@code "user"}, the only identity source) to pass
 * {@link BoardAccessService#canAccess(String, String)} for the board id that
 * {@link #extractBoardId(String)} resolves from the destination; allow caches the
 * boardId under session-attribute {@code "authorizedBoards"}. The destination
 * must match exactly one of the four shapes main publishes:
 * <pre>
 *   /topic/board/{id}
 *   /topic/board/{op}/{id}     op in {@link #BOARD_TOPIC_OPS} (17)
 *   /topic/board/{id}/el
 *   /topic/draw/board/{id}
 * </pre>
 * where {@code {id}} is non-empty, contains no {@code /} or {@code *}, and is
 * neither an op name nor {@code el}. Any other {@code /topic} destination,
 * including AntPathMatcher wildcard shapes like {@code /topic/**} or
 * {@code /topic/board/*}, is denied fail-closed before any repository lookup.
 * {@code /user/} and {@code /queue/} personal destinations pass without a
 * board check.
 *
 * <p>SEND to {@code /app/board/{join|leave|cursor}/{boardId}} allows on a cache
 * hit with zero guard/repository calls (cursor perf path), else performs
 * exactly one real {@code canAccess} fallback check and populates the cache on
 * allow (empty cache never fail-opens). Every other SEND destination and every
 * non-SUBSCRIBE/SEND command (CONNECT, DISCONNECT, UNSUBSCRIBE, ACK/NACK,
 * heartbeats) passes through unchanged — SEND outside {@code /app/} is already
 * denied by {@link com.example.ie213backend.config.socket.StompAuthChannelInterceptor},
 * and the 17 in-handler {@code assertCanEdit} (owner or EDITOR) guards remain
 * the enforcement point for mutations.
 *
 * <p>Deny = throw {@link MessagingException} (ERROR frame + session close).
 * Accepted residuals: no mid-session cache eviction on revocation; the inbound
 * channel is a thread pool with no same-session single-threading guarantee, so
 * a lazy-init race on the session attributes map may at most cost one extra
 * {@code canAccess} call on a later frame, never an allow without one.
 */
public class BoardTopicAuthorizationInterceptor implements ChannelInterceptor {

    static final String AUTHORIZED_BOARDS_ATTR = "authorizedBoards";
    private static final String USER_ATTR = "user";
    private static final Set<String> GUARDED_SEND_OPS = Set.of("join", "leave", "cursor");

    /** 17 op của dạng /topic/board/{op}/{id} (BoardSocketController @SendTo). Thêm topic mới thì thêm vào đây. */
    static final Set<String> BOARD_TOPIC_OPS = Set.of(
            "addStickyNote", "addStickyNotes", "ChangeTextStickyNote", "cursor", "delete-paths",
            "deleteImage", "deleteStickyNote", "image", "images", "lockStickyNote", "move-paths",
            "moveImage", "moveStickyNote", "resizeImage", "reSizeStickyNote", "unLockStickyNote", "update-paths");
    private static final String EL_SUFFIX = "el";

    private final BoardAccessService boardAccessService;

    public BoardTopicAuthorizationInterceptor(BoardAccessService boardAccessService) {
        this.boardAccessService = boardAccessService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (command == StompCommand.SUBSCRIBE) {
            handleSubscribe(accessor);
        } else if (command == StompCommand.SEND) {
            handleSend(accessor);
        }
        // CONNECT, DISCONNECT, UNSUBSCRIBE, ACK, NACK, null-command heartbeats: unchanged.
        return message;
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination != null && (destination.startsWith("/user/") || destination.startsWith("/queue/"))) {
            return; // personal destination (only /user/queue/session exists), no board data
        }

        String boardId = extractBoardId(destination);
        if (boardId == null) {
            deny("SUBSCRIBE denied: not an authorized board topic: " + destination);
            return;
        }

        UserDto user = extractUser(accessor);
        if (user == null || user.getId() == null || !boardAccessService.canAccess(boardId, user.getId())) {
            deny("SUBSCRIBE denied: user not authorized for board " + boardId);
            return;
        }

        authorizedBoards(accessor).add(boardId);
    }

    private void handleSend(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null) {
            deny("SEND denied: missing destination");
            return;
        }

        if (destination.contains("//")) {
            deny("SEND denied: empty path segment in destination");
            return;
        }

        String[] segments = destination.split("/", -1);
        if (!isGuardedSendPrefix(segments)) {
            return; // not join/leave/cursor -> pass through (in-handler assertCanEdit applies)
        }

        String boardId = (segments.length == 5) ? segments[4] : "";
        if (boardId.isEmpty()) {
            deny("SEND denied: malformed guarded destination " + destination);
            return;
        }

        UserDto user = extractUser(accessor);
        if (user == null || user.getId() == null) {
            deny("SEND denied: missing session user for " + destination);
            return;
        }

        Set<String> cache = authorizedBoards(accessor);
        if (cache.contains(boardId)) {
            return; // zero-lookup fast path (cursor perf requirement)
        }

        if (!boardAccessService.canAccess(boardId, user.getId())) {
            deny("SEND denied: user not authorized for board " + boardId);
            return;
        }
        cache.add(boardId);
    }

    private static boolean isGuardedSendPrefix(String[] segments) {
        return segments.length >= 4
                && segments[0].isEmpty()
                && "app".equals(segments[1])
                && "board".equals(segments[2])
                && GUARDED_SEND_OPS.contains(segments[3]);
    }

    /**
     * Exhaustive shape matcher (M1). Returns the {@code {id}} of exactly one of
     * the four accepted shapes, else {@code null} (fail-closed): null input,
     * unknown prefix, wrong segment count (trailing slash, {@code /el/x}),
     * unknown op, invalid id. Replaces the last-segment rule, which returned
     * {@code "el"} for main's {@code /topic/board/{id}/el} and denied every
     * SVG-scene subscriber.
     */
    static String extractBoardId(String destination) {
        if (destination == null || !destination.startsWith("/topic/")) {
            return null;
        }

        String[] s = destination.split("/", -1); // s[0] = "", s[1] = "topic"
        switch (s.length) {
            case 4:
                // /topic/board/{id}
                return "board".equals(s[2]) ? validId(s[3]) : null;
            case 5:
                if ("draw".equals(s[2]) && "board".equals(s[3])) {
                    return validId(s[4]); // /topic/draw/board/{id}
                }
                if (!"board".equals(s[2])) {
                    return null;
                }
                if (EL_SUFFIX.equals(s[4])) {
                    return validId(s[3]); // /topic/board/{id}/el
                }
                if (BOARD_TOPIC_OPS.contains(s[3])) {
                    return validId(s[4]); // /topic/board/{op}/{id}
                }
                return null;
            default:
                return null;
        }
    }

    // {id}: khác rỗng, không "/" hay "*" (wildcard AntPathMatcher), không trùng op, không phải "el"
    private static String validId(String id) {
        if (id == null || id.isEmpty() || id.indexOf('/') >= 0 || id.indexOf('*') >= 0) {
            return null;
        }
        if (EL_SUFFIX.equals(id) || BOARD_TOPIC_OPS.contains(id)) {
            return null;
        }
        return id;
    }

    private UserDto extractUser(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return null;
        }
        Object user = sessionAttributes.get(USER_ATTR);
        return (user instanceof UserDto) ? (UserDto) user : null;
    }

    @SuppressWarnings("unchecked")
    private Set<String> authorizedBoards(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            // No session attributes map to cache into; throwaway set so the
            // caller's logic still works, nothing persists across frames.
            return ConcurrentHashMap.newKeySet();
        }
        return (Set<String>) sessionAttributes.computeIfAbsent(
                AUTHORIZED_BOARDS_ATTR, key -> ConcurrentHashMap.newKeySet());
    }

    private void deny(String reason) {
        throw new MessagingException(reason);
    }
}
