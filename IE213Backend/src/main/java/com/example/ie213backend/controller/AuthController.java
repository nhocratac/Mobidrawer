package com.example.ie213backend.controller;

import com.example.ie213backend.dto.AuthDto.*;
import com.example.ie213backend.model.User;
import com.example.ie213backend.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;


@Controller
@RequestMapping("/auth")
public class AuthController {
    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<User> login(
            @RequestBody LoginRequest loginRequest
    ) {
        String email = loginRequest.getEmail();
        String password = loginRequest.getPassword();
        User user = authService.login(email, password);
        if(user != null) {
            return  ResponseEntity.ok(user);
        }
        return  ResponseEntity.notFound().build();
    }

    @PostMapping("/register")
    public ResponseEntity<String> register(
            @RequestBody @Valid RegisterDto registerDto) {
        String email = registerDto.getEmail();
        String password = registerDto.getPassword();
        String firstName = registerDto.getFirstName();
        String lastName = registerDto.getLastName();
        String phone = registerDto.getPhone();
        return ResponseEntity.ok(authService.createRegistrationRequest(email, password, firstName, lastName, phone));
    }

    @PostMapping("/verify-register")
    public ResponseEntity<String> verifyRegister(
            @RequestBody @Valid VerifyRegistrationRequest verifyRegistrationRequest
    ) {
        String code = verifyRegistrationRequest.getCode();
        String email = verifyRegistrationRequest.getEmail();
        if (authService.verifyCode(email, code)) {
            return ResponseEntity.ok("success");
        }
        return ResponseEntity.badRequest().body("không thể xác thực");
    }

    @PostMapping("/request-forget-password")
    public ResponseEntity<String> forgetPassword(
            @RequestBody @Valid RequestForgetPassword requestForgetPassword
            ) {
        return ResponseEntity.ok(authService.forgetPassword(requestForgetPassword.getEmail()));
    }

    @PostMapping("/verify-forget-password")
    public ResponseEntity<String> verifyPassword(
            @RequestBody @Valid VerifyForgetPassword verifyForgetPassword
            ) {
        String email = verifyForgetPassword.getEmail();
        String password = verifyForgetPassword.getPassword();
        String code = verifyForgetPassword.getCode();
        return ResponseEntity.ok(authService.resetPassword(email, code, password));
    }

}
