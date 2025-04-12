package com.example.ie213backend.service;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.dto.AuthDto.RegistrationRequest;
import org.springframework.security.core.userdetails.UserDetails;

public interface AuthService {
    UserDetails authenticate(String email, String password);
    String generateToken(UserDetails userDetails, TokenType tokenType);
    UserDetails validateToken(String token,TokenType tokenType);
    String createRegistrationRequest(String email, String password,String firstName, String lastName,String phone);
    RegistrationRequest getRegistrationRequest(String email);
    boolean verifyCode(String email, String code);
    String forgetPassword(String email);
    String resetPassword(String email, String code, String newPassword);
}
