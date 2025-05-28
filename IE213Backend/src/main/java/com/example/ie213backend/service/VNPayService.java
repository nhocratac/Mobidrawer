package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.UserPlansDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import jakarta.servlet.http.HttpServletRequest;

public interface VNPayService {
    String createPaymentUrl(CreatePaymentDto createPaymentDto, HttpServletRequest req);
    UserDto validPayment(HttpServletRequest req);
    UserPlansDto getUserPlanInfo(String userPlanId);
}
