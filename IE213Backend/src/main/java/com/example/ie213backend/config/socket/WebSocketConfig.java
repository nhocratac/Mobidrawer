package com.example.ie213backend.config.socket;

import com.example.ie213backend.security.BoardAccessService;
import com.example.ie213backend.security.BoardTopicAuthorizationInterceptor;
import com.example.ie213backend.service.AuthService;
import com.example.ie213backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {


    private final AuthService authService;
    private final BoardAccessService boardAccessService;
    private TaskScheduler messageBrokerTaskScheduler;

    public WebSocketConfig(AuthService authService, BoardAccessService boardAccessService) {
        this.authService = authService;
        this.boardAccessService = boardAccessService;
    }

    /**
     * The framework's own messageBrokerTaskScheduler (ThreadPoolTaskScheduler), injected lazily
     * to avoid a cycle - pattern from the Spring reference docs for SimpleBroker heartbeats.
     */
    @Autowired
    public void setMessageBrokerTaskScheduler(@Lazy @Qualifier("messageBrokerTaskScheduler") TaskScheduler taskScheduler) {
        this.messageBrokerTaskScheduler = taskScheduler;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Server<->client STOMP heartbeats (10s each way) so a half-open connection is closed
        // and SessionDisconnectEvent fires, letting presence remove the dead session.
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10000, 10000})
                .setTaskScheduler(this.messageBrokerTaskScheduler);
        config.setApplicationDestinationPrefixes("/app");
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Process each session's inbound frames in order (SUBSCRIBE before join; join/leave/join).
        registry.setPreserveReceiveOrder(true);
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("http://localhost:3000", "https://localhost:3000", "https://mobidrawer.id.vn")
                .withSockJS()
                .setSuppressCors(true);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        // Cấu hình giới hạn gửi message
        registration.setMessageSizeLimit(128 * 1024); // 128KB
        registration.setSendBufferSizeLimit(512 * 1024); // 512KB
        registration.setSendTimeLimit(10 * 1000); // 10s timeout
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Order matters: authenticate (sets session "user") before board authorization reads it.
        registration.interceptors(
                new StompAuthChannelInterceptor(authService),
                new BoardTopicAuthorizationInterceptor(boardAccessService));
    }
}
