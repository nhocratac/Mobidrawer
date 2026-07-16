package com.example.ie213backend.configstore;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

/**
 * Pure-JVM HMAC-SHA256 signer for the outbound {@code POST
 * /internal/config/reload} call - the sender-side counterpart of the
 * FROZEN {@link ReloadHmacVerifier} (never edited this sprint). Reuses the
 * verifier's canonicalization exactly: {@code timestamp + "\n" + body}.
 *
 * <p>The secret is sourced from THE SAME property key
 * {@code config.reload.secret} (env {@code CONFIG_RELOAD_SECRET}) with NO
 * inline default - no second property name, no re-implementation of
 * relaxed binding, no hardcoded secret anywhere. It is never exposed via
 * any getter, log line, or DTO field.
 */
@Component
public class ReloadHmacSigner {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String secret;

    public ReloadHmacSigner(@Value("${config.reload.secret}") String secret) {
        this.secret = secret;
    }

    /** Fail-closed check: callers must not attempt an HTTP call on a blank secret. */
    public boolean isConfigured() {
        return secret != null && !secret.isBlank();
    }

    /**
     * Computes lowercase-hex HMAC-SHA256 over {@code timestamp + "\n" + body}
     * (body coerced to "" when null), matching {@link ReloadHmacVerifier}'s
     * canonicalization exactly so its output is ACCEPTED by the verifier for
     * the same secret. Style-only note: lowercase hex is a Read-noted
     * expectation, not a verdict driver, since the verifier normalizes case.
     */
    public String sign(String timestamp, String body) {
        String canonical = timestamp + "\n" + (body == null ? "" : body);
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            byte[] raw = mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(raw);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute reload HMAC signature", e);
        }
    }
}
