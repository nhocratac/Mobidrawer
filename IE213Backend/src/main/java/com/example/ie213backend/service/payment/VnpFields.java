package com.example.ie213backend.service.payment;

import java.util.Map;

/** VNPay fields captured on settlement; params is the secret-free callback/query payload for audit. */
public record VnpFields(String transactionNo, String bankCode, String responseCode, String payDate, Map<String, String> params) {}
