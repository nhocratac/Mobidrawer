package com.example.ie213backend.security;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
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
import java.util.HashMap;
import java.util.Map;

@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final AuthService authService;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            if (shouldSkipFilter(request)) {
                filterChain.doFilter(request, response);
                return; // 🚀 Bỏ qua kiểm tra token
            }

            String token = extractToken(request);
            if (token != null) {
                UserDetails userDetails = authService.validateToken(token, TokenType.ACCESS);
                Authentication authentication = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);

                if (userDetails instanceof DrawUserDetails) {
                    request.setAttribute("userId", ((DrawUserDetails) userDetails).getId());
                    request.setAttribute("user", UserMapper.INSTANCE.toDto(((DrawUserDetails) userDetails).getUser()));
                }

                filterChain.doFilter(request, response);
            } else {
                responseJsonError(response, "No token provided", TokenErrorType.NOPROVIDED);
            }
        } catch (MalformedJwtException | SignatureException e) {
            responseJsonError(response, "Invalid token", TokenErrorType.INVALID);
        } catch (ExpiredJwtException e) {
            responseJsonError(response, "Access token expired", TokenErrorType.EXPIRED);
        } catch (JwtException e) {
            responseJsonError(response, e.getMessage(), TokenErrorType.INVALID);
        }
    }

    public enum TokenErrorType {
        EXPIRED, INVALID, NOPROVIDED
    }

    private void responseJsonError(HttpServletResponse response,
                                   String message,
                                   TokenErrorType tokenErrorType) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("message", message);
        responseBody.put("errorType", tokenErrorType);
        responseBody.put("statusCode", HttpServletResponse.SC_UNAUTHORIZED);

        response.getWriter().write(objectMapper.writeValueAsString(responseBody));
    }

    private String extractToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");

        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    private boolean shouldSkipFilter(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getServletPath();

        // Bỏ qua những URL không cần xác thực
        return (
                path.startsWith("/api/v1/auth/login") ||
                        path.startsWith("/api/v1/auth/register") ||
                        path.startsWith("/api/v1/auth/verify-register") ||
                        path.startsWith("/api/v1/auth/refresh") ||
                        ("GET".equalsIgnoreCase(method) && path.startsWith("/api/v1/template"))||
                        ("GET".equalsIgnoreCase(method) && path.matches("/api/v1/comments/[^/]+/replies")) ||
                        ("GET".equalsIgnoreCase(method) && path.matches("/api/v1/blogs/[^/]+")) || // /api/v1/blogs/{blogId}
                        ("GET".equalsIgnoreCase(method) && path.equals("/api/v1/blogs")) ||
                        ("GET".equalsIgnoreCase(method) && path.equals("/api/v1/check-env")) ||
                        ("GET".equalsIgnoreCase(method) && path.equals("/api/v1/comments")) ||
                        path.startsWith("/ws/") ||
                        ("OPTIONS".equalsIgnoreCase(method))
        );
    }

}
