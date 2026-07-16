package com.example.ie213backend.configstore;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Round-trip test proving {@link ReloadHmacSigner}'s output interoperates
 * with the FROZEN {@link ReloadHmacVerifier} (never edited this sprint) -
 * same secret, same canonical string ({@code timestamp + "\n" + body}), the
 * verifier's injectable-clock overload. No Spring context, no Mockito.
 */
class ReloadHmacSignerTest {

    private static final String SECRET = "shared-reload-secret-value";
    private static final long NOW = 1_700_000_000L;

    @Test
    void signerOutputAcceptedByFrozenVerifierForSameSecretAndBody() {
        ReloadHmacSigner signer = new ReloadHmacSigner(SECRET);
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);

        String timestamp = String.valueOf(NOW);
        String body = "";
        String signature = signer.sign(timestamp, body);

        assertTrue(verifier.verify(timestamp, signature, body, NOW));
    }

    @Test
    void signerOutputAcceptedForNonEmptyBody() {
        ReloadHmacSigner signer = new ReloadHmacSigner(SECRET);
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);

        String timestamp = String.valueOf(NOW);
        String body = "{\"foo\":\"bar\"}";
        String signature = signer.sign(timestamp, body);

        assertTrue(verifier.verify(timestamp, signature, body, NOW));
    }

    @Test
    void tamperedSignatureRejectedByFrozenVerifier() {
        ReloadHmacSigner signer = new ReloadHmacSigner(SECRET);
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);

        String timestamp = String.valueOf(NOW);
        String body = "";
        String signature = signer.sign(timestamp, body);
        String tampered = signature.equals("0".repeat(64)) ? "1".repeat(64) : "0".repeat(64);

        assertFalse(verifier.verify(timestamp, tampered, body, NOW));
    }

    @Test
    void tamperedTimestampRejectedByFrozenVerifier() {
        ReloadHmacSigner signer = new ReloadHmacSigner(SECRET);
        ReloadHmacVerifier verifier = new ReloadHmacVerifier(SECRET);

        String signedTimestamp = String.valueOf(NOW);
        String body = "";
        String signature = signer.sign(signedTimestamp, body);

        // verifier is asked to check a DIFFERENT timestamp header than the one
        // that was actually signed - canonical string mismatches, must reject.
        String differentTimestamp = String.valueOf(NOW + 1);
        assertFalse(verifier.verify(differentTimestamp, signature, body, NOW + 1));
    }

    @Test
    void signerProducesLowercaseHex() {
        ReloadHmacSigner signer = new ReloadHmacSigner(SECRET);
        String signature = signer.sign(String.valueOf(NOW), "");
        assertTrue(signature.equals(signature.toLowerCase()));
    }

    @Test
    void isConfiguredFalseOnBlankSecret() {
        ReloadHmacSigner signer = new ReloadHmacSigner("   ");
        assertFalse(signer.isConfigured());
    }

    @Test
    void isConfiguredTrueOnPresentSecret() {
        ReloadHmacSigner signer = new ReloadHmacSigner(SECRET);
        assertTrue(signer.isConfigured());
    }
}
