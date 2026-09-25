package com.example.ie213backend.config.socket;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.security.DrawUserDetails;
import com.example.ie213backend.service.AuthService;
import io.jsonwebtoken.JwtException;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Map;

/**
 * Client-inbound STOMP authentication guard. Must run BEFORE
 * {@link com.example.ie213backend.security.BoardTopicAuthorizationInterceptor}.
 *
 * <p>The SockJS handshake is anonymous; the JWT travels only in the
 * {@code Authorization: Bearer <jwt>} native header of the STOMP CONNECT frame
 * (never in the URL). On a valid ACCESS token the session attributes receive
 * {@code "user"} (UserDto, the identity source for all downstream checks) and
 * {@code "wsTokenExp"} (token expiry, epoch millis). A second CONNECT on an
 * already-authenticated session is denied (no identity switch).
 *
 * <p>Every other client command except DISCONNECT and null-command heartbeats
 * is fail-closed: denied without a session user, or once the token has expired.
 * SUBSCRIBE to raw {@code /queue/**} is denied (use {@code /user/queue/...}).
 * SEND is allowed only to {@code /app/**} (application handlers); a SEND to any
 * other destination (e.g. {@code /topic/**}, {@code /user/**}) is denied so it
 * can never reach the broker directly.
 *
 * <p>Deny = throw {@link MessagingException} (ERROR frame + session close).
 * Header values are never logged or echoed.
 */
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    static final String USER_ATTR = "user";
    static final String TOKEN_EXP_ATTR = "wsTokenExp";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String APP_PREFIX = "/app/";

    private final AuthService authService;

    public StompAuthChannelInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null) {
            accessor = StompHeaderAccessor.wrap(message);
        }
        StompCommand command = accessor.getCommand();
        if (command == null || command == StompCommand.DISCONNECT) {
            return message; // heartbeat / disconnect: always allowed
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            deny("Unauthorized");
        }

        if (command == StompCommand.CONNECT || command == StompCommand.STOMP) {
            handleConnect(accessor, sessionAttributes);
            return message;
        }

        if (!(sessionAttributes.get(USER_ATTR) instanceof UserDto)) {
            deny("Unauthorized");
        }
        Object exp = sessionAttributes.get(TOKEN_EXP_ATTR);
        if (!(exp instanceof Long) || System.currentTimeMillis() > (Long) exp) {
            deny("Token expired");
        }
        if (command == StompCommand.SUBSCRIBE) {
            String destination = accessor.getDestination();
            if (destination != null && destination.startsWith("/queue/")) {
                deny("SUBSCRIBE denied: raw /queue destinations are not allowed");
            }
        }
        if (command == StompCommand.SEND) {
            // Clients may only SEND to @MessageMapping handlers; a SEND to /topic/**,
            // /queue/** or /user/** would reach the broker and bypass handler guards.
            String destination = accessor.getDestination();
            if (destination == null || !destination.startsWith(APP_PREFIX)) {
                deny("SEND denied: only /app destinations are allowed");
            }
        }
        return message;
    }

    private void handleConnect(StompHeaderAccessor accessor, Map<String, Object> sessionAttributes) {
        if (sessionAttributes.get(USER_ATTR) != null) {
            deny("Session already authenticated");
        }

        String header = accessor.getFirstNativeHeader("Authorization");
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            deny("Unauthorized");
        }
        String token = header.substring(BEARER_PREFIX.length()).trim();
        if (token.isEmpty()) {
            deny("Unauthorized");
        }

        UserDto user;
        long expiration;
        try {
            UserDetails userDetails = authService.validateToken(token, TokenType.ACCESS);
            if (!(userDetails instanceof DrawUserDetails)) {
                deny("Unauthorized");
            }
            user = UserMapper.INSTANCE.toDto(((DrawUserDetails) userDetails).getUser());
            expiration = authService.extractExpiration(token, TokenType.ACCESS).getTime();
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException e) {
            throw new MessagingException("Unauthorized");
        }

        sessionAttributes.put(USER_ATTR, user);
        sessionAttributes.put(TOKEN_EXP_ATTR, expiration);
    }

    private void deny(String reason) {
        throw new MessagingException(reason);
    }
}
