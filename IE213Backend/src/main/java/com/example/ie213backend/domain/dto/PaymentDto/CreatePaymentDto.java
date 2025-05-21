package com.example.ie213backend.domain.dto.PaymentDto;

import com.example.ie213backend.domain.Plans;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class CreatePaymentDto {
    @NotNull
    @Positive
    int amount;

    @NotNull
    Plans plan;

    String bankCode;

    String language;

    @NotBlank
    String orderInfo;

    String orderType = "other";
}
