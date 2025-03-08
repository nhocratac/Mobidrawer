package com.example.ie213backend.controller;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.dto.AuthDto.*;
import com.example.ie213backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping(path = "${api.prefix}/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest loginRequest) {
        UserDetails userDetails = authService.authenticate(loginRequest.getEmail(), loginRequest.getPassword());

        String accessToken = authService.generateToken(userDetails, TokenType.ACCESS);
        String refreshToken = authService.generateToken(userDetails, TokenType.REFRESH);
        AuthResponse authResponse = AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .build();

        return ResponseEntity.ok(authResponse);
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String,String>> register(
            @RequestBody @Valid RegisterDto registerDto) {
        System.out.println(registerDto);
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
