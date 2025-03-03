package com.example.ie213backend.service;

import com.example.ie213backend.domain.TokenType;
import org.springframework.security.core.userdetails.UserDetails;

public interface AuthService {
    UserDetails authenticate(String email, String password);
    String generateToken(UserDetails userDetails, TokenType tokenType);
}
