package com.example.ie213backend.domain.dto.PaymentDto;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import lombok.*;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class OrderStatusDto {
    private String txnRef;
    private OrderStatus status;
    private Plans plan;
    private long amountVnd;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private String grantedUserPlanId;
    private String vnpResponseCode;
}
