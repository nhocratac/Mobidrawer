package com.example.ie213backend.config.socket;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.security.DrawUserDetails;
import com.example.ie213backend.service.AuthService;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Map;
import java.util.List;

public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private final AuthService authService;

    public WebSocketAuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        // Lấy token từ query string
        String query = request.getURI().getQuery(); // Ví dụ: token=abc123
        if (query != null && query.startsWith("token=")) {
            String token = query.substring(6);
            UserDetails userDetails = authService.validateToken(token, TokenType.ACCESS);
            if (userDetails != null) {
                attributes.put("user", UserMapper.INSTANCE.toDto(((DrawUserDetails) userDetails).getUser()));
                return true;
            }
        }
        return false;
    }


    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               Exception exception) {
    }
}
