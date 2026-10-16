package com.example.ie213backend.service.payment;

public class GatewayException extends RuntimeException {
    public GatewayException(String message, Throwable cause) { super(message, cause); }
}
