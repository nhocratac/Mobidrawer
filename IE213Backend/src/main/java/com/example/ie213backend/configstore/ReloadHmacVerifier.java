package com.example.ie213backend.configstore;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;

/**
 * Pure-JVM HMAC-SHA256 verifier for the {@code POST /internal/config/reload}
 * webhook. See {@link ConfigReloadController} for the full protocol javadoc.
 *
 * <p>Fail-closed: a null/blank secret, a null/blank/non-numeric timestamp, an
 * out-of-window timestamp, or a signature mismatch all resolve to {@code
 * false} — never an exception escapes this class. The secret is sourced from
 * {@code config.reload.secret} (env {@code CONFIG_RELOAD_SECRET} via Spring
 * relaxed binding — the same precedent as {@code jwt.secret}); it is never
 * hardcoded and carries no inline default.
 */
@Component
public class ReloadHmacVerifier {

    private static final long ALLOWED_SKEW_SECONDS = 300;
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String secret;

    public ReloadHmacVerifier(@Value("${config.reload.secret}") String secret) {
        this.secret = secret;
    }

    /** Verifies against the current wall-clock time. */
    public boolean verify(String timestampHeader, String signatureHeader, String rawBody) {
        return verify(timestampHeader, signatureHeader, rawBody, Instant.now().getEpochSecond());
    }

    /**
     * Verifies against an explicit "now" (epoch seconds) so callers (and tests)
     * can inject a fixed clock instead of relying on the system clock.
     */
    public boolean verify(String timestampHeader, String signatureHeader, String rawBody, long nowEpochSeconds) {
        if (secret == null || secret.isBlank()) {
            return false;
        }
        if (timestampHeader == null || timestampHeader.isBlank()) {
            return false;
        }
        if (signatureHeader == null || signatureHeader.isBlank()) {
            return false;
        }

        long timestamp;
        try {
            timestamp = Long.parseLong(timestampHeader.trim());
        } catch (NumberFormatException e) {
            return false;
        }

        if (Math.abs(nowEpochSeconds - timestamp) > ALLOWED_SKEW_SECONDS) {
            return false;
        }

        String body = rawBody == null ? "" : rawBody;
        String canonical = timestampHeader + "\n" + body;

        byte[] expected;
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            expected = mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            return false;
        }

        byte[] presented;
        try {
            presented = HexFormat.of().parseHex(signatureHeader.trim().toLowerCase());
        } catch (IllegalArgumentException e) {
            return false;
        }

        return MessageDigest.isEqual(expected, presented);
    }
}
