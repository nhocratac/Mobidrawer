package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.ApiTemplateResponse;
import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.SaveUserPlanDto;
import com.example.ie213backend.domain.dto.PaymentDto.UserPlansDto;
import com.example.ie213backend.domain.dto.PaymentDto.ValidPaymentDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.VNPayService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RequiredArgsConstructor
@RestController
@RequestMapping("${api.prefix}/payments")
public class PaymentController {
    private final VNPayService vnPayService;

    @PostMapping("/create-payment-url")
    public ResponseEntity<ApiTemplateResponse<String>> createPaymentUrl(@Valid @RequestBody CreatePaymentDto createPaymentDto, HttpServletRequest req) {
        String paymentUrl = vnPayService.createPaymentUrl(createPaymentDto, req);
        ApiTemplateResponse<String> res = ApiTemplateResponse.<String>builder()
                .status(HttpStatus.OK.toString())
                .message("Payment url generated successfully!")
                .data(paymentUrl)
                .build();

        return ResponseEntity.ok(res);
    }

    @GetMapping("/valid-payment")
    public ResponseEntity<UserDto> validPayment(HttpServletRequest req) {
        UserDto message = vnPayService.validPayment(req);

        return ResponseEntity.ok(message);
    }

    @GetMapping("/{userPlanId}")
    public ResponseEntity<UserPlansDto> getUserPlans(@PathVariable String userPlanId) {
        UserPlansDto userPlansDto = vnPayService.getUserPlanInfo(userPlanId);

        return ResponseEntity.ok(userPlansDto);
    }
}
