package com.example.ie213backend.configstore;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure-JVM tests for {@link ReloadHmacVerifier} — no Spring context, no
 * mocks. The verifier needs no test double at all: a real HMAC is computed
 * over a known secret/string and a fixed "now" is injected so the 300s
 * boundary tests never flake against the system clock.
 */
class ReloadHmacVerifierTest {

    private static final String SECRET = "test-reload-secret-value";
    private static final long NOW = 1_700_000_000L;

    private static String sign(String secret, String canonical) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] raw = mac.doFinal(canonical.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(raw);
    }

    @Test
    void validSignatureAccepted() throws Exception {
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);
        String timestamp = String.valueOf(NOW);
        String body = "{\"foo\":\"bar\"}";
        String sig = sign(SECRET, timestamp + "\n" + body);

        assertTrue(verifier.verify(timestamp, sig, body, NOW));
    }

    @Test
    void tamperedBodyRejected() throws Exception {
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);
        String timestamp = String.valueOf(NOW);
        String sig = sign(SECRET, timestamp + "\n" + "{\"foo\":\"bar\"}");

        assertFalse(verifier.verify(timestamp, sig, "{\"foo\":\"tampered\"}", NOW));
    }

    @Test
    void wrongSignatureRejected() {
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);
        String timestamp = String.valueOf(NOW);

        assertFalse(verifier.verify(timestamp, "0".repeat(64), "{}", NOW));
    }

    @Test
    void staleTimestampRejected() throws Exception {
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);
        String timestamp = String.valueOf(NOW - 301);
        String sig = sign(SECRET, timestamp + "\n" + "");

        assertFalse(verifier.verify(timestamp, sig, "", NOW));
    }

    @Test
    void futureTimestampRejected() throws Exception {
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);
        String timestamp = String.valueOf(NOW + 301);
        String sig = sign(SECRET, timestamp + "\n" + "");

        assertFalse(verifier.verify(timestamp, sig, "", NOW));
    }

    @Test
    void blankSecretRejected() throws Exception {
        ReloadHmacVerifier verifier = new ReloadHmacVerifier("   ");
        String timestamp = String.valueOf(NOW);
        String sig = sign(SECRET, timestamp + "\n" + "");

        assertFalse(verifier.verify(timestamp, sig, "", NOW));
    }

    @Test
    void nonNumericTimestampRejectedWithoutExceptionEscaping() throws Exception {
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);
        String sig = sign(SECRET, "not-a-number\n" + "");

        assertFalse(verifier.verify("not-a-number", sig, "", NOW));
    }
}
