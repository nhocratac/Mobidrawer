package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.OrderStatusDto;
import com.example.ie213backend.domain.dto.PaymentDto.UserPlansDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;

public interface VNPayService {
    String createPaymentUrl(CreatePaymentDto dto, String userId, String clientIp);
    OrderStatusDto getOrderStatus(String txnRef, UserDto actor);
    UserPlansDto getUserPlanInfo(String userPlanId, UserDto user);
    void checkExpiringMemberships();
}
