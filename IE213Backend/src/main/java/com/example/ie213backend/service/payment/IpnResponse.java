package com.example.ie213backend.service.payment;

/** Body VNPay expects from the IPN URL: {"RspCode": "..", "Message": ".."}. Codes per VNPay doc (verified on sandbox in Task 12). */
public record IpnResponse(String rspCode, String message) {
    public static final IpnResponse OK = new IpnResponse("00", "Confirm Success");
    public static final IpnResponse ORDER_NOT_FOUND = new IpnResponse("01", "Order not found");
    public static final IpnResponse ALREADY_CONFIRMED = new IpnResponse("02", "Order already confirmed");
    public static final IpnResponse INVALID_AMOUNT = new IpnResponse("04", "Invalid amount");
    public static final IpnResponse INVALID_SIGNATURE = new IpnResponse("97", "Invalid signature");
    public static final IpnResponse UNKNOWN_ERROR = new IpnResponse("99", "Unknown error");
}
