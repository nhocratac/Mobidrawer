package com.example.ie213backend.service.payment;

import java.util.LinkedHashMap;
import java.util.Map;

/** VNPay fields captured on settlement; params is the secret-free callback/query payload for audit. */
public record VnpFields(String transactionNo, String bankCode, String responseCode, String payDate, Map<String, String> params) {

    public static VnpFields of(Map<String, String> vnp) {
        Map<String, String> p = stripHash(vnp);
        return new VnpFields(p.get("vnp_TransactionNo"), p.get("vnp_BankCode"), p.get("vnp_ResponseCode"), p.get("vnp_PayDate"), p);
    }

    public VnpFields withResponseCode(String code) {
        return new VnpFields(transactionNo, bankCode, code, payDate, params);
    }

    /** VNPay: ResponseCode 00 and (TransactionStatus absent or 00) means the payment succeeded. */
    public static boolean paid(String responseCode, String transactionStatus) {
        return "00".equals(responseCode) && (transactionStatus == null || "00".equals(transactionStatus));
    }

    /** Copy of the map without the signature keys; null-safe. */
    public static Map<String, String> stripHash(Map<String, String> vnp) {
        Map<String, String> p = new LinkedHashMap<>();
        if (vnp != null) p.putAll(vnp);
        p.remove("vnp_SecureHash");
        p.remove("vnp_SecureHashType");
        return p;
    }
}
