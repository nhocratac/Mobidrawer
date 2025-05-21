package com.example.ie213backend.domain.dto.PaymentDto;

import com.example.ie213backend.domain.Plans;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class SaveUserPlanDto {
    @NotBlank
    private String userId;

    @NotNull
    private Plans plan;

    @NotNull
    private Long amount;

    @NotBlank
    private String orderCode;
}
