package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.model.PaymentOrder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class VNPayGatewayTest {
    VNPaySigner signer = new VNPaySigner("secret");
    RestClient.Builder builder;
    MockRestServiceServer server;
    VNPayGateway gw;

    PaymentOrder order = PaymentOrder.builder()
            .txnRef("ABC123XYZ789").userId("650000000000000000000a01").plan(Plans.PRO).amountVnd(400_000L)
            .status(OrderStatus.PENDING)
            .createdAt(LocalDateTime.of(2026, 10, 15, 9, 30, 0)).expiresAt(LocalDateTime.of(2026, 10, 15, 9, 45, 0))
            .orderInfo("Mobidrawer PRO").locale("vn").clientIp("127.0.0.1").build();

    @BeforeEach
    void setUp() {
        builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        gw = new VNPayGateway(signer, builder, "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "https://app.test/payment-callback", "TMN001", "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction");
    }

    @Test
    void buildPayUrl_usesOrderFields_andValidSignature() {
        String url = gw.buildPayUrl(order);
        assertTrue(url.startsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?"));
        Map<String, String> q = UriComponentsBuilder.fromUriString(url).build().getQueryParams().toSingleValueMap();
        assertEquals("40000000", q.get("vnp_Amount"));
        assertEquals("ABC123XYZ789", q.get("vnp_TxnRef"));
        assertEquals("20261015093000", q.get("vnp_CreateDate"));
        assertEquals("20261015094500", q.get("vnp_ExpireDate"));
        assertEquals("TMN001", q.get("vnp_TmnCode"));
        assertEquals("vn", q.get("vnp_Locale"));
        assertEquals("2.1.0", q.get("vnp_Version"));
        assertEquals("pay", q.get("vnp_Command"));
        assertNull(q.get("vnp_BankCode"), "no bank code requested -> param absent");
        // query values are URL-encoded once; decode before verifying like VNPay would
        Map<String, String> decoded = UriComponentsBuilder.fromUriString(url).build(true).getQueryParams().toSingleValueMap();
        Map<String, String> plain = new java.util.HashMap<>();
        decoded.forEach((k, v) -> plain.put(k, java.net.URLDecoder.decode(v, java.nio.charset.StandardCharsets.US_ASCII)));
        assertTrue(signer.verify(plain), "pay URL must carry a signature VNPay can verify");
    }

    @Test
    void buildPayUrl_withBankCode() {
        order.setBankCodeRequested("NCB");
        Map<String, String> q = UriComponentsBuilder.fromUriString(gw.buildPayUrl(order)).build().getQueryParams().toSingleValueMap();
        assertEquals("NCB", q.get("vnp_BankCode"));
    }

    @Test
    void queryDr_success_parsesFields() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.vnp_Command").value("querydr"))
                .andExpect(jsonPath("$.vnp_TxnRef").value("ABC123XYZ789"))
                .andExpect(jsonPath("$.vnp_TransactionDate").value("20261015093000"))
                .andExpect(jsonPath("$.vnp_SecureHash").isNotEmpty())
                .andRespond(withSuccess("{\"vnp_ResponseCode\":\"00\",\"vnp_TransactionStatus\":\"00\",\"vnp_Amount\":\"40000000\"," +
                        "\"vnp_TransactionNo\":\"14000001\",\"vnp_PayDate\":\"20261015093512\",\"vnp_BankCode\":\"NCB\",\"vnp_TxnRef\":\"ABC123XYZ789\"}",
                        MediaType.APPLICATION_JSON));
        QueryDrResult r = gw.queryDr(order);
        assertTrue(r.found());
        assertTrue(r.isSuccess());
        assertEquals(40_000_000L, r.amount());
        assertEquals("14000001", r.transactionNo());
        assertEquals("20261015093512", r.payDate());
        server.verify();
    }

    @Test
    void queryDr_notFound_91() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                .andRespond(withSuccess("{\"vnp_ResponseCode\":\"91\",\"vnp_Message\":\"Not found\"}", MediaType.APPLICATION_JSON));
        QueryDrResult r = gw.queryDr(order);
        assertFalse(r.found());
        assertFalse(r.isSuccess());
        assertEquals("91", r.responseCode());
    }

    @Test
    void queryDr_transactionFailed_02() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                .andRespond(withSuccess("{\"vnp_ResponseCode\":\"00\",\"vnp_TransactionStatus\":\"02\",\"vnp_Amount\":\"40000000\"}", MediaType.APPLICATION_JSON));
        QueryDrResult r = gw.queryDr(order);
        assertTrue(r.found());
        assertFalse(r.isSuccess());
    }

    @Test
    void queryDr_serverError_throwsGatewayException() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction")).andRespond(withServerError());
        assertThrows(GatewayException.class, () -> gw.queryDr(order));
    }

    @Test
    void queryDr_emptyBody_throwsGatewayException() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                .andRespond(withSuccess("", MediaType.APPLICATION_JSON));
        assertThrows(GatewayException.class, () -> gw.queryDr(order));
    }

    @Test
    void queryDr_nonNumericAmount_throwsGatewayException() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                .andRespond(withSuccess("{\"vnp_ResponseCode\":\"00\",\"vnp_Amount\":\"abc\"}", MediaType.APPLICATION_JSON));
        assertThrows(GatewayException.class, () -> gw.queryDr(order));
    }

    @Test
    void queryDr_badChecksum_97_throwsGatewayException() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                .andRespond(withSuccess("{\"vnp_ResponseCode\":\"97\",\"vnp_Message\":\"Invalid checksum\"}", MediaType.APPLICATION_JSON));
        assertThrows(GatewayException.class, () -> gw.queryDr(order));
    }

    @Test
    void queryDr_otherError_99_throwsGatewayException() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                .andRespond(withSuccess("{\"vnp_ResponseCode\":\"99\"}", MediaType.APPLICATION_JSON));
        assertThrows(GatewayException.class, () -> gw.queryDr(order));
    }

    @Test
    void queryDr_missingResponseCode_throwsGatewayException() {
        server.expect(requestTo("https://sandbox.vnpayment.vn/merchant_webapi/api/transaction"))
                .andRespond(withSuccess("{\"vnp_Message\":\"x\"}", MediaType.APPLICATION_JSON));
        assertThrows(GatewayException.class, () -> gw.queryDr(order));
    }
}
