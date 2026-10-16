package com.example.ie213backend.domain;

public enum OrderStatus {
    PENDING, PAID, FAILED, EXPIRED;

    /** Only PENDING can still change; the other three are terminal. */
    public boolean isOpen() { return this == PENDING; }
}
