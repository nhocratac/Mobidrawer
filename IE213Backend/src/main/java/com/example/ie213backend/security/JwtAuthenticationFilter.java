package com.example.ie213backend.security;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.service.AuthService;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final AuthService authService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String path = request.getServletPath();
            if (path.startsWith("/api/v1/auth/login") || path.startsWith("/api/v1/auth/register") || path.startsWith("/api/v1/auth/refresh")) {
                filterChain.doFilter(request, response);
                return; // 🚀 Bỏ qua kiểm tra token
            }

            String token = extractToken(request);
            if(token != null) {
                UserDetails userDetails = authService.validateToken(token, TokenType.ACCESS);
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);

                if(userDetails instanceof DrawUserDetails) {
                    request.setAttribute("userId", ((DrawUserDetails) userDetails).getId());
                    request.setAttribute("user", UserMapper.INSTANCE.toDto(((DrawUserDetails) userDetails).getUser()));
                }
            }
        } catch (ExpiredJwtException e) {
            // Do not throw exception, just don't authenticate the user;
            log.warn(e.getMessage() + "Received invalid auth token");

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"status\":401, \"message\":\"Access token expired\"}");
            return; // Ngăn request tiếp tục đi qua filterChain
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if(bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
