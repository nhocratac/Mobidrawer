package com.example.ie213backend.domain.dto.PaymentDto;

import com.example.ie213backend.domain.Plans;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PaymentRequest {
    String userId;
    Plans plan;
    long amount;
    String orderCode;
    String createdAt;

    @Override
    public String toString() {
        return "PaymentRequest{" +
                "userId='" + userId + '\'' +
                ", orderCode='" + orderCode + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
