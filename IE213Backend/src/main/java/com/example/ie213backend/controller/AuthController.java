package com.example.ie213backend.controller;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.dto.AuthDto.*;
import com.example.ie213backend.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping(path = "${api.prefix}/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest loginRequest,
            HttpServletResponse response) {
        UserDetails userDetails = authService.authenticate(loginRequest.getEmail(), loginRequest.getPassword());

        String accessToken = authService.generateToken(userDetails, TokenType.ACCESS);
        String refreshToken = authService.generateToken(userDetails, TokenType.REFRESH);

        AuthResponse authResponse = AuthResponse.builder().accessToken(accessToken).refreshToken(refreshToken).build();

        Cookie refreshTokenCookie = new Cookie("refreshToken", refreshToken);
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setMaxAge(7 * 24 * 60 * 60);
        refreshTokenCookie.setPath("/");

        Cookie accessTokenCookie = new Cookie("accessToken", accessToken);
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setMaxAge(15 * 60);
        accessTokenCookie.setPath("/");

        response.addCookie(refreshTokenCookie);
        response.addCookie(accessTokenCookie);
        response.addHeader("Authorization", "Bearer " + accessToken);
        return ResponseEntity.ok(authResponse);
    }

    @GetMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(
            @CookieValue(name = "refreshToken", required = true) String refreshToken,
            HttpServletResponse response
            ) {
        if(refreshToken == null || refreshToken.isEmpty()) {
            return ResponseEntity.badRequest().body(AuthResponse.builder().accessToken(null).build());
        }

        UserDetails userDetails = authService.validateToken(refreshToken, TokenType.REFRESH);

        String newAccessToken = authService.generateToken(userDetails, TokenType.ACCESS);
        if (newAccessToken == null) {
            return ResponseEntity.badRequest().body(AuthResponse.builder().accessToken(null).build());
        }

        Cookie accessTokenCookie = new Cookie("accessToken", newAccessToken);
        accessTokenCookie.setHttpOnly(true);
        accessTokenCookie.setMaxAge(15 * 60);
        accessTokenCookie.setPath("/");

        response.addCookie(accessTokenCookie);
        response.addHeader("Authorization", "Bearer " + newAccessToken);
        AuthResponse authResponse = AuthResponse.builder().accessToken(newAccessToken).build();

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String,String>> register(
            @RequestBody @Valid RegisterDto registerDto) {
        String email = registerDto.getEmail();
        String password = registerDto.getPassword();
        String firstName = registerDto.getFirstName();
        String lastName = registerDto.getLastName();
        String phone = registerDto.getPhone();
        String result = authService.createRegistrationRequest(email, password, firstName, lastName, phone);
        Map<String, String> response = new HashMap<>();
        response.put("message", result);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-register")
    public ResponseEntity<Map<String,String>> verifyRegister(
            @RequestBody @Valid VerifyRegistrationRequest verifyRegistrationRequest
    ) {
        String code = verifyRegistrationRequest.getCode();
        String email = verifyRegistrationRequest.getEmail();
        Map<String, String> response = new HashMap<>();
        if (authService.verifyCode(email, code)) {
            response.put("message", "xác thực thành công ");
            return ResponseEntity.ok(response);
        }
        response.put("message", "không thể xác thực");
        return ResponseEntity.badRequest().body(response);
    }

    @PostMapping("/request-forget-password")
    public ResponseEntity<Map<String, String>> forgetPassword(
            @RequestBody @Valid RequestForgetPassword requestForgetPassword
    ) {
        String result = authService.forgetPassword(requestForgetPassword.getEmail());

        Map<String, String> response = new HashMap<>();
        response.put("message", result);

        return ResponseEntity.ok(response);
    }


    @PostMapping("/verify-forget-password")
    public ResponseEntity<Map<String, String>> verifyPassword(
            @RequestBody @Valid VerifyForgetPassword verifyForgetPassword
    ) {
        String email = verifyForgetPassword.getEmail();
        String password = verifyForgetPassword.getPassword();
        String code = verifyForgetPassword.getCode();

        String result = authService.resetPassword(email, code, password);

        Map<String, String> response = new HashMap<>();
        response.put("message", result);

        return ResponseEntity.ok(response);
    }
}
