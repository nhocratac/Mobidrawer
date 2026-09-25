package com.example.ie213backend.config.socket;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.dto.AuthDto.RegistrationRequest;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.security.DrawUserDetails;
import com.example.ie213backend.service.AuthService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pure-JVM unit tests for StompAuthChannelInterceptor: hand-rolled fake
 * AuthService and real Message objects built via StompHeaderAccessor +
 * MessageBuilder. No Mockito, no Spring context.
 */
class StompAuthChannelInterceptorTest {

    private static final String VALID_TOKEN = "valid.jwt.token";
    private static final String USER_ID = "user-1";

    private FakeAuthService authService;
    private StompAuthChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        authService = new FakeAuthService();
        interceptor = new StompAuthChannelInterceptor(authService);
    }

    // ---- CONNECT ----
    @Test
    void connect_validBearer_setsUserAndExpiry() {
        Map<String, Object> session = new HashMap<>();
        Message<byte[]> connect = connectMessage("Bearer " + VALID_TOKEN, session);
        assertEquals(connect, interceptor.preSend(connect, mockChannel()));
        Object user = session.get(StompAuthChannelInterceptor.USER_ATTR);
        assertInstanceOf(UserDto.class, user);
        assertEquals(USER_ID, ((UserDto) user).getId());
        assertEquals(authService.expiration.getTime(), session.get(StompAuthChannelInterceptor.TOKEN_EXP_ATTR));
    }

    @Test
    void connect_stompCommand_validBearer_setsUser() {
        Map<String, Object> session = new HashMap<>();
        Message<byte[]> connect = stompMessage(StompCommand.STOMP, null, "Bearer " + VALID_TOKEN, session);
        interceptor.preSend(connect, mockChannel());
        assertInstanceOf(UserDto.class, session.get(StompAuthChannelInterceptor.USER_ATTR));
    }

    @Test
    void connect_missingHeader_denied() {
        Map<String, Object> session = new HashMap<>();
        Message<byte[]> connect = connectMessage(null, session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(connect, mockChannel()));
        assertTrue(session.isEmpty());
    }

    @Test
    void connect_nonBearerHeader_denied() {
        Message<byte[]> connect = connectMessage("Basic abc", new HashMap<>());
        assertThrows(MessagingException.class, () -> interceptor.preSend(connect, mockChannel()));
        assertEquals(0, authService.validateCalls);
    }

    @Test
    void connect_emptyBearer_denied() {
        Message<byte[]> connect = connectMessage("Bearer ", new HashMap<>());
        assertThrows(MessagingException.class, () -> interceptor.preSend(connect, mockChannel()));
        assertEquals(0, authService.validateCalls);
    }

    @Test
    void connect_garbageToken_deniedAsMessagingException() {
        authService.failure = new MalformedJwtException("bad");
        Map<String, Object> session = new HashMap<>();
        Message<byte[]> connect = connectMessage("Bearer garbage", session);
        MessagingException ex = assertThrows(MessagingException.class, () -> interceptor.preSend(connect, mockChannel()));
        assertEquals("Unauthorized", ex.getMessage());
        assertTrue(session.isEmpty());
    }

    @Test
    void connect_expiredToken_deniedAsMessagingException() {
        authService.failure = new ExpiredJwtException(null, null, "expired");
        Message<byte[]> connect = connectMessage("Bearer " + VALID_TOKEN, new HashMap<>());
        MessagingException ex = assertThrows(MessagingException.class, () -> interceptor.preSend(connect, mockChannel()));
        assertEquals("Unauthorized", ex.getMessage());
    }

    @Test
    void connect_wrongTokenType_deniedAsMessagingException() {
        authService.failure = new JwtException("Wrong type of token!");
        Message<byte[]> connect = connectMessage("Bearer " + VALID_TOKEN, new HashMap<>());
        assertThrows(MessagingException.class, () -> interceptor.preSend(connect, mockChannel()));
    }

    @Test
    void connect_secondConnectOnAuthenticatedSession_denied() {
        Map<String, Object> session = authenticatedSession(future());
        Object before = session.get(StompAuthChannelInterceptor.USER_ATTR);
        Message<byte[]> connect = connectMessage("Bearer " + VALID_TOKEN, session);
        assertThrows(MessagingException.class, () -> interceptor.preSend(connect, mockChannel()));
        assertSame(before, session.get(StompAuthChannelInterceptor.USER_ATTR));
        assertEquals(0, authService.validateCalls);
    }

    // ---- unauthenticated frames ----
    @Test
    void subscribeUserQueue_withoutUser_denied() {
        Message<byte[]> subscribe = stompMessage(StompCommand.SUBSCRIBE, "/user/queue/session", null, new HashMap<>());
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
    }

    @Test
    void sendAppConnect_withoutUser_denied() {
        Message<byte[]> send = stompMessage(StompCommand.SEND, "/app/connect", null, new HashMap<>());
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    @Test
    void unsubscribe_withoutUser_denied() {
        Message<byte[]> unsubscribe = stompMessage(StompCommand.UNSUBSCRIBE, null, null, new HashMap<>());
        assertThrows(MessagingException.class, () -> interceptor.preSend(unsubscribe, mockChannel()));
    }

    // ---- authenticated frames ----
    @Test
    void subscribeUserQueue_withUser_allowed() {
        Message<byte[]> subscribe = stompMessage(StompCommand.SUBSCRIBE, "/user/queue/session", null, authenticatedSession(future()));
        assertEquals(subscribe, interceptor.preSend(subscribe, mockChannel()));
    }

    @Test
    void sendAppConnect_withUser_allowed() {
        Message<byte[]> send = stompMessage(StompCommand.SEND, "/app/connect", null, authenticatedSession(future()));
        assertEquals(send, interceptor.preSend(send, mockChannel()));
    }

    @Test
    void subscribeRawQueue_withUser_denied() {
        Message<byte[]> subscribe = stompMessage(StompCommand.SUBSCRIBE, "/queue/session-userXYZ", null, authenticatedSession(future()));
        assertThrows(MessagingException.class, () -> interceptor.preSend(subscribe, mockChannel()));
    }

    @Test
    void send_afterTokenExpiry_deniedTokenExpired() {
        Message<byte[]> send = stompMessage(StompCommand.SEND, "/app/connect", null,
                authenticatedSession(System.currentTimeMillis() - 1000));
        MessagingException ex = assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
        assertEquals("Token expired", ex.getMessage());
    }

    // ---- SEND destination prefix: only /app/** ----
    @Test
    void sendAppBoardHandler_withUser_allowed() {
        Message<byte[]> send = stompMessage(StompCommand.SEND, "/app/board/draw/board-1", null, authenticatedSession(future()));
        assertEquals(send, interceptor.preSend(send, mockChannel()));
    }

    @Test
    void sendTopic_withUser_denied() {
        Message<byte[]> send = stompMessage(StompCommand.SEND, "/topic/board/deleteStickyNote/board-1", null, authenticatedSession(future()));
        MessagingException ex = assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
        assertEquals("SEND denied: only /app destinations are allowed", ex.getMessage());
    }

    @Test
    void sendUserDestination_withUser_denied() {
        Message<byte[]> send = stompMessage(StompCommand.SEND, "/user/someone/queue/session", null, authenticatedSession(future()));
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    @Test
    void sendRawQueue_withUser_denied() {
        Message<byte[]> send = stompMessage(StompCommand.SEND, "/queue/session-userXYZ", null, authenticatedSession(future()));
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    @Test
    void sendPrefixLookalike_withUser_denied() {
        // "/application" starts with "/app" but is not under the /app/ prefix.
        Message<byte[]> send = stompMessage(StompCommand.SEND, "/application/topic/board/board-1", null, authenticatedSession(future()));
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    @Test
    void sendMissingDestination_withUser_denied() {
        Message<byte[]> send = stompMessage(StompCommand.SEND, null, null, authenticatedSession(future()));
        assertThrows(MessagingException.class, () -> interceptor.preSend(send, mockChannel()));
    }

    // ---- pass-through ----
    @Test
    void disconnect_withoutUser_passes() {
        Message<byte[]> disconnect = stompMessage(StompCommand.DISCONNECT, null, null, new HashMap<>());
        assertEquals(disconnect, interceptor.preSend(disconnect, mockChannel()));
    }

    @Test
    void heartbeat_withoutUser_passes() {
        // null-command heartbeat, as produced by the STOMP decoder
        StompHeaderAccessor heartbeatAccessor = StompHeaderAccessor.createForHeartbeat();
        heartbeatAccessor.setSessionAttributes(new HashMap<>());
        heartbeatAccessor.setLeaveMutable(true);
        Message<byte[]> heartbeat = MessageBuilder.createMessage(new byte[0], heartbeatAccessor.getMessageHeaders());
        assertEquals(SimpMessageType.HEARTBEAT, heartbeatAccessor.getMessageType());
        assertEquals(heartbeat, interceptor.preSend(heartbeat, mockChannel()));
    }

    // ---- helpers ----
    private static long future() {
        return System.currentTimeMillis() + 60_000;
    }

    private Map<String, Object> authenticatedSession(long tokenExp) {
        Map<String, Object> session = new HashMap<>();
        UserDto user = new UserDto();
        user.setId(USER_ID);
        session.put(StompAuthChannelInterceptor.USER_ATTR, user);
        session.put(StompAuthChannelInterceptor.TOKEN_EXP_ATTR, tokenExp);
        return session;
    }

    private Message<byte[]> connectMessage(String authorization, Map<String, Object> sessionAttributes) {
        return stompMessage(StompCommand.CONNECT, null, authorization, sessionAttributes);
    }

    private Message<byte[]> stompMessage(StompCommand command, String destination, String authorization,
                                         Map<String, Object> sessionAttributes) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        if (destination != null) {
            accessor.setDestination(destination);
        }
        if (authorization != null) {
            accessor.setNativeHeader("Authorization", authorization);
        }
        accessor.setSessionAttributes(sessionAttributes);
        accessor.setSessionId("session-1");
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private MessageChannel mockChannel() {
        return (message, timeout) -> true;
    }

    private static final class FakeAuthService implements AuthService {
        RuntimeException failure;
        Date expiration = new Date(System.currentTimeMillis() + 3_600_000);
        int validateCalls;

        @Override
        public UserDetails validateToken(String token, TokenType tokenType) {
            validateCalls++;
            if (failure != null) {
                throw failure;
            }
            assertEquals(VALID_TOKEN, token);
            assertEquals(TokenType.ACCESS, tokenType);
            User user = new User();
            user.setId(USER_ID);
            user.setEmail("user@example.com");
            return new DrawUserDetails(user);
        }

        @Override
        public Date extractExpiration(String token, TokenType tokenType) {
            if (failure != null) {
                throw failure;
            }
            return expiration;
        }

        @Override public UserDetails authenticate(String email, String password) { throw new UnsupportedOperationException(); }
        @Override public String generateToken(UserDetails userDetails, TokenType tokenType) { throw new UnsupportedOperationException(); }
        @Override public String createRegistrationRequest(String email, String password, String firstName, String lastName, String phone) { throw new UnsupportedOperationException(); }
        @Override public RegistrationRequest getRegistrationRequest(String email) { throw new UnsupportedOperationException(); }
        @Override public boolean verifyCode(String email, String code) { throw new UnsupportedOperationException(); }
        @Override public String forgetPassword(String email) { throw new UnsupportedOperationException(); }
        @Override public String resetPassword(String email, String code, String newPassword) { throw new UnsupportedOperationException(); }
    }
}
