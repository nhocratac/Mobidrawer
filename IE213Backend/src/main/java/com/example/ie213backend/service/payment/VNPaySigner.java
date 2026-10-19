package com.example.ie213backend.service.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.*;

/** VNPay HMAC-SHA512 signing. Fails closed: crypto errors throw, never return "". */
@Component
public class VNPaySigner {
    private final String secret;

    public VNPaySigner(@Value("${vnp.secret.key}") String secret) { this.secret = secret; }

    public String hashData(Map<String, String> params) {
        List<String> keys = new ArrayList<>(params.keySet());
        Collections.sort(keys);
        StringBuilder sb = new StringBuilder();
        for (String k : keys) {
            String v = params.get(k);
            if (v == null || v.isEmpty()) continue;
            if (sb.length() > 0) sb.append('&');
            sb.append(k).append('=').append(URLEncoder.encode(v, StandardCharsets.US_ASCII));
        }
        return sb.toString();
    }

    public String sign(Map<String, String> params) { return hmac(hashData(params)); }

    public boolean verify(Map<String, String> paramsWithHash) {
        String given = paramsWithHash.get("vnp_SecureHash");
        if (given == null || given.isEmpty()) return false;
        Map<String, String> p = new HashMap<>(paramsWithHash);
        p.remove("vnp_SecureHash");
        p.remove("vnp_SecureHashType");
        byte[] expected = sign(p).getBytes(StandardCharsets.US_ASCII);
        byte[] actual = given.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(expected, actual);
    }

    public String signPipe(String... values) { return hmac(String.join("|", values)); }

    public String hmac(String data) {
        if (secret == null || secret.isEmpty()) throw new IllegalStateException("vnp.secret.key is not configured");
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            byte[] out = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(out.length * 2);
            for (byte b : out) sb.append(String.format("%02x", b & 0xff));
            return sb.toString();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA512 failed", e);
        }
    }
}
