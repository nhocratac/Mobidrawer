package com.example.ie213backend.domain.dto.PaymentDto;

import com.example.ie213backend.domain.Plans;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class UserPlansDto {
    private String id;
    private String userId;
    private Plans plan;
    private long amount;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private boolean active;
}
