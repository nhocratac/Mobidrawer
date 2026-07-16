package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.dto.ReloadResultDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.Map;

/**
 * Server-to-server caller of the FROZEN {@code POST /internal/config/reload}
 * webhook (see {@link ConfigReloadController}, never edited this sprint).
 * Uses the pre-existing {@link RestTemplate} bean (no new dependency).
 *
 * <p>ANY failure - blank/unconfigured secret, connect exception, timeout, or
 * a non-2xx response including 401 - is caught here and converted into a
 * structured {@link ReloadResultDto}; it NEVER escapes as an exception, so
 * callers (the PUT write path and the manual reload proxy) can never have
 * their own response corrupted by a reload failure. There is exactly ONE
 * HMAC computation site in the whole sprint diff: {@link ReloadHmacSigner#sign}.
 */
@Component
public class ConfigReloadClient {

    private final RestTemplate restTemplate;
    private final ReloadHmacSigner signer;
    private final String reloadUrl;

    public ConfigReloadClient(RestTemplate restTemplate,
                               ReloadHmacSigner signer,
                               @Value("${config.reload.url:http://localhost:8080/internal/config/reload}") String reloadUrl) {
        this.restTemplate = restTemplate;
        this.signer = signer;
        this.reloadUrl = reloadUrl;
    }

    public ReloadResultDto triggerReload() {
        if (!signer.isConfigured()) {
            return ReloadResultDto.failed("config.reload.secret is not configured; reload webhook was not called");
        }

        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        String body = "";
        String signature;
        try {
            signature = signer.sign(timestamp, body);
        } catch (Exception e) {
            return ReloadResultDto.failed("Failed to compute reload signature: " + e.getMessage());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Config-Timestamp", timestamp);
        headers.set("X-Config-Signature", signature);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    reloadUrl, HttpMethod.POST, requestEntity, Map.class);
            Object changedKeysRaw = response.getBody() != null ? response.getBody().get("changedKeys") : null;
            Integer changedKeys = changedKeysRaw instanceof Number number ? number.intValue() : null;
            return ReloadResultDto.ok(changedKeys);
        } catch (HttpStatusCodeException e) {
            return ReloadResultDto.failed(
                    "Reload webhook returned HTTP " + e.getStatusCode().value() + ": " + e.getMessage());
        } catch (RestClientException e) {
            return ReloadResultDto.failed("Reload webhook call failed: " + e.getMessage());
        }
    }
}
