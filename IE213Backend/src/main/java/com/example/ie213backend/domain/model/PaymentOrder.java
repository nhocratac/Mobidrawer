package com.example.ie213backend.domain.model;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.SettlementSource;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * One VNPay order. Source of truth from creation to settlement.
 * State machine: PENDING -> PAID | FAILED | EXPIRED (terminal). Transitions only via OrderLedger.settle.
 * Never embed this type in another document (issue #21: embedded @CompoundIndex leaks).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "payment_orders")
@CompoundIndexes({
        @CompoundIndex(name = "order_status_created", def = "{'status': 1, 'createdAt': 1}"),
        @CompoundIndex(name = "order_user_created", def = "{'userId': 1, 'createdAt': -1}")
})
public class PaymentOrder {
    @Id
    private String id;

    @Indexed(name = "order_txnref", unique = true)
    private String txnRef;

    @Field(targetType = FieldType.OBJECT_ID)
    private String userId;

    private Plans plan;
    private long amountVnd;
    private OrderStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private LocalDateTime paidAt;
    private LocalDateTime updatedAt;

    private String vnpTransactionNo;
    private String vnpBankCode;
    private String vnpResponseCode;
    private String vnpPayDate;

    private String grantedUserPlanId;
    private SettlementSource settledBy;
    private Map<String, String> lastCallbackParams;
    private Map<String, String> lateSuccessParams;
    private LocalDateTime lateSuccessAt;

    private String orderInfo;
    private String bankCodeRequested;
    private String locale;
    private String clientIp;
}
