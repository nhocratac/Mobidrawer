package com.example.ie213backend.domain.dto.PaymentDto;

import com.example.ie213backend.domain.Plans;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
// amount is priced server-side; ignore a stale client still sending "amount"
@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public class CreatePaymentDto {
    @NotNull
    Plans plan;

    String bankCode;

    String language;

    @NotBlank
    String orderInfo;

    String orderType = "other";
}
