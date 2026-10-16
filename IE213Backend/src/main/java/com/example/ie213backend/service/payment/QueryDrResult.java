package com.example.ie213backend.service.payment;

import java.util.Map;

public record QueryDrResult(boolean found, String responseCode, String transactionStatus, Long amount,
                            String transactionNo, String payDate, String bankCode, Map<String, String> raw) {
    /** VNPay: vnp_ResponseCode 00 = query ok; vnp_TransactionStatus 00 = payment succeeded. */
    public boolean isSuccess() {
        return found && "00".equals(responseCode) && (transactionStatus == null || "00".equals(transactionStatus));
    }
}
