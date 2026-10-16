package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.model.PaymentOrder;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/** Everything that talks to VNPay: pay URL (redirect) and querydr (reconciliation). */
@Slf4j
@Component
public class VNPayGateway {
    static final DateTimeFormatter VNP_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final String VERSION = "2.1.0";

    private final VNPaySigner signer;
    private final RestClient rest;
    private final ObjectMapper json = new ObjectMapper();
    private final String payUrl, returnUrl, tmnCode, apiUrl;

    public VNPayGateway(VNPaySigner signer, RestClient.Builder builder,
                        @Value("${vnp.pay.url}") String payUrl, @Value("${vnp.return.url}") String returnUrl,
                        @Value("${vnp.tmn.code}") String tmnCode, @Value("${vnp.api.url}") String apiUrl) {
        this.signer = signer;
        // Timeouts come from spring.http.client.connect-timeout/read-timeout (Boot 3.4 applies them to the
        // auto-configured RestClient.Builder). Not unit-testable with MockRestServiceServer.
        this.rest = builder.build();
        this.payUrl = payUrl; this.returnUrl = returnUrl; this.tmnCode = tmnCode; this.apiUrl = apiUrl;
    }

    static String fmt(LocalDateTime t) { return t.format(VNP_DATE); }

    public String buildPayUrl(PaymentOrder o) {
        Map<String, String> p = new HashMap<>();
        p.put("vnp_Version", VERSION);
        p.put("vnp_Command", "pay");
        p.put("vnp_TmnCode", tmnCode);
        p.put("vnp_Amount", String.valueOf(o.getAmountVnd() * 100));
        p.put("vnp_CurrCode", "VND");
        if (o.getBankCodeRequested() != null && !o.getBankCodeRequested().isEmpty()) p.put("vnp_BankCode", o.getBankCodeRequested());
        p.put("vnp_TxnRef", o.getTxnRef());
        p.put("vnp_OrderInfo", o.getOrderInfo());
        p.put("vnp_OrderType", "other");
        p.put("vnp_Locale", (o.getLocale() == null || o.getLocale().isEmpty()) ? "vn" : o.getLocale());
        p.put("vnp_ReturnUrl", returnUrl);
        p.put("vnp_IpAddr", o.getClientIp());
        p.put("vnp_CreateDate", fmt(o.getCreatedAt()));
        p.put("vnp_ExpireDate", fmt(o.getExpiresAt()));

        String hash = signer.sign(p);
        List<String> keys = new ArrayList<>(p.keySet());
        Collections.sort(keys);
        StringBuilder q = new StringBuilder();
        for (String k : keys) {
            String v = p.get(k);
            if (v == null || v.isEmpty()) continue;
            if (q.length() > 0) q.append('&');
            q.append(URLEncoder.encode(k, StandardCharsets.US_ASCII)).append('=').append(URLEncoder.encode(v, StandardCharsets.US_ASCII));
        }
        return payUrl + "?" + q + "&vnp_SecureHash=" + hash;
    }

    public QueryDrResult queryDr(PaymentOrder o) {
        String requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 32);
        String createDate = fmt(OrderLedger.nowVn());
        String txnDate = fmt(o.getCreatedAt());
        String ip = o.getClientIp() == null ? "127.0.0.1" : o.getClientIp();
        String info = o.getOrderInfo() == null ? "" : o.getOrderInfo();
        Map<String, String> body = new LinkedHashMap<>();
        body.put("vnp_RequestId", requestId);
        body.put("vnp_Version", VERSION);
        body.put("vnp_Command", "querydr");
        body.put("vnp_TmnCode", tmnCode);
        body.put("vnp_TxnRef", o.getTxnRef());
        body.put("vnp_OrderInfo", info);
        body.put("vnp_TransactionDate", txnDate);
        body.put("vnp_CreateDate", createDate);
        body.put("vnp_IpAddr", ip);
        body.put("vnp_SecureHash", signer.signPipe(requestId, VERSION, "querydr", tmnCode, o.getTxnRef(), txnDate, createDate, ip, info));
        try {
            String raw = rest.post().uri(apiUrl).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(String.class);
            if (raw == null || raw.isBlank()) throw new GatewayException("empty querydr reply", null);
            Map<String, String> r = json.readValue(raw, new TypeReference<Map<String, String>>() {});
            String rc = r.get("vnp_ResponseCode");
            // 00 = found, 91 = not found. Anything else (97 bad checksum, 99, 94, 02, 03, missing) is an
            // inconclusive reply: throw so the reconciler leaves the order PENDING instead of expiring it.
            if (!"00".equals(rc) && !"91".equals(rc)) throw new GatewayException("querydr rc=" + rc, null);
            boolean found = "00".equals(rc);
            Long amount = r.get("vnp_Amount") == null ? null : Long.parseLong(r.get("vnp_Amount"));
            return new QueryDrResult(found, rc, r.get("vnp_TransactionStatus"), amount,
                    r.get("vnp_TransactionNo"), r.get("vnp_PayDate"), r.get("vnp_BankCode"), r);
        } catch (RestClientException | java.io.IOException | NumberFormatException e) {
            throw new GatewayException("querydr failed for " + o.getTxnRef(), e);
        }
    }
}
