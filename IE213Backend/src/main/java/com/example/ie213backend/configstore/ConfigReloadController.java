package com.example.ie213backend.configstore;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Internal ops webhook that reloads the in-memory config cache
 * ({@link ConfigCache}) from the DB-backed config store (sub-project #1),
 * guarded by HMAC-SHA256 instead of a user JWT so ops/CI can call it without
 * an application login. Deliberately mapped OUTSIDE the {@code /api/v1} user
 * surface.
 *
 * <p><b>Protocol</b>:
 * <ul>
 *   <li>Headers: {@code X-Config-Timestamp} — Unix epoch seconds (decimal
 *       string); {@code X-Config-Signature} — lowercase-hex HMAC-SHA256
 *       signature.</li>
 *   <li>Canonical string signed: {@code timestamp + "\n" + rawBody} (rawBody
 *       is {@code ""} when the request has no body).</li>
 *   <li>Replay window: the request is rejected when
 *       {@code |now - timestamp| > 300} seconds (checked both directions).</li>
 *   <li>Secret: {@code config.reload.secret} (env {@code CONFIG_RELOAD_SECRET}
 *       via Spring relaxed binding — never hardcoded, no inline default).</li>
 * </ul>
 *
 * <p><b>Example</b>:
 * <pre>{@code
 * TS=$(date +%s)
 * SIG=$(printf '%s\n' "$TS" | openssl dgst -sha256 -hmac "$CONFIG_RELOAD_SECRET" | awk '{print $2}')
 * curl -X POST https://api.example.com/internal/config/reload \
 *   -H "X-Config-Timestamp: $TS" \
 *   -H "X-Config-Signature: $SIG"
 * }</pre>
 *
 * <p>Any auth defect (missing headers, non-numeric or out-of-window
 * timestamp, signature mismatch, blank secret) resolves to the verifier
 * returning {@code false}, which this handler maps to a single
 * {@link ResponseStatusException} with {@link HttpStatus#UNAUTHORIZED} —
 * mapped to a 401 by the existing (unmodified)
 * {@code ErrorController.handleResponseStatusException}. No new servlet
 * filter is introduced for this endpoint.
 */
@RestController
public class ConfigReloadController {

    private final ReloadHmacVerifier verifier;
    private final ConfigCache configCache;

    public ConfigReloadController(ReloadHmacVerifier verifier, ConfigCache configCache) {
        this.verifier = verifier;
        this.configCache = configCache;
    }

    @PostMapping("/internal/config/reload")
    public ResponseEntity<Map<String, Object>> reload(
            @RequestHeader(value = "X-Config-Timestamp", required = false) String timestamp,
            @RequestHeader(value = "X-Config-Signature", required = false) String signature,
            @RequestBody(required = false) String body) {

        if (!verifier.verify(timestamp, signature, body)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or missing HMAC signature");
        }

        int changedKeys = configCache.refresh();
        return ResponseEntity.ok(Map.of("changedKeys", changedKeys));
    }
}
