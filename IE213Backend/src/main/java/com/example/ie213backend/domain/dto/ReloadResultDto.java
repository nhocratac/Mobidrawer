package com.example.ie213backend.domain.dto;

import lombok.Getter;

/**
 * Structured, explicit-discriminator outcome of one reload-webhook call.
 * Shared by the PUT write path and the manual reload proxy - there is
 * exactly one HMAC/HTTP implementation in this sprint (ConfigReloadClient)
 * and both endpoints surface its result via this same shape. status is
 * "OK" or "FAILED" (never absent/implicit); changedKeys is populated only
 * on success; error carries human-readable detail (including any upstream
 * HTTP status such as 401) only on failure. Never carries the reload
 * secret or any other @Value-bound secret.
 */
@Getter
public class ReloadResultDto {
    private final String status;
    private final Integer changedKeys;
    private final String error;

    private ReloadResultDto(String status, Integer changedKeys, String error) {
        this.status = status;
        this.changedKeys = changedKeys;
        this.error = error;
    }

    public static ReloadResultDto ok(Integer changedKeys) {
        return new ReloadResultDto("OK", changedKeys, null);
    }

    public static ReloadResultDto failed(String error) {
        return new ReloadResultDto("FAILED", null, error);
    }
}
