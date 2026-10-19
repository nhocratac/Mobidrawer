package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.SettlementSource;
import com.example.ie213backend.domain.model.PaymentOrder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentIpnHandlerTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }

    VNPaySigner signer = mock(VNPaySigner.class);
    OrderLedger ledger = mock(OrderLedger.class);
    PlanGrantService grants = mock(PlanGrantService.class);
    PaymentIpnHandler handler = new PaymentIpnHandler(signer, ledger, grants, "TMN001");

    PaymentOrder pending = PaymentOrder.builder().txnRef("T1").userId("u1").plan(Plans.PRO).amountVnd(400_000L).status(OrderStatus.PENDING).build();

    Map<String, String> params(String responseCode) {
        Map<String, String> p = new HashMap<>();
        p.put("vnp_TmnCode", "TMN001"); p.put("vnp_TxnRef", "T1"); p.put("vnp_Amount", "40000000");
        p.put("vnp_ResponseCode", responseCode); p.put("vnp_TransactionStatus", responseCode);
        p.put("vnp_TransactionNo", "14000001"); p.put("vnp_BankCode", "NCB"); p.put("vnp_PayDate", "20261015093512");
        p.put("vnp_SecureHash", "sig");
        return p;
    }

    @BeforeEach
    void setUp() {
        when(signer.verify(anyMap())).thenReturn(true);
        when(ledger.findByTxnRef("T1")).thenReturn(Optional.of(pending));
        when(ledger.settle(eq("T1"), any(), any(), any())).thenAnswer(i -> {
            PaymentOrder o = PaymentOrder.builder().txnRef("T1").userId("u1").plan(Plans.PRO).amountVnd(400_000L).status(i.getArgument(1)).build();
            return o;
        });
    }

    @Test
    void badSignature_97_nothingElseTouched() {
        when(signer.verify(anyMap())).thenReturn(false);
        assertEquals(IpnResponse.INVALID_SIGNATURE, handler.handle(params("00")));
        verifyNoInteractions(ledger, grants);
    }

    @Test
    void unknownOrder_01() {
        when(ledger.findByTxnRef("T1")).thenReturn(Optional.empty());
        assertEquals(IpnResponse.ORDER_NOT_FOUND, handler.handle(params("00")));
        verify(ledger, never()).settle(any(), any(), any(), any());
    }

    @Test
    void wrongTmn_97() {
        Map<String, String> p = params("00"); p.put("vnp_TmnCode", "OTHER");
        assertEquals(IpnResponse.INVALID_SIGNATURE, handler.handle(p));
        verify(ledger, never()).settle(any(), any(), any(), any());
    }

    @Test
    void amountMismatch_04_noSettle() {
        Map<String, String> p = params("00"); p.put("vnp_Amount", "40000001");
        assertEquals(IpnResponse.INVALID_AMOUNT, handler.handle(p));
        verify(ledger, never()).settle(any(), any(), any(), any());
    }

    @Test
    void handle_terminalOrder_returns02_noGrant() {
        pending.setStatus(OrderStatus.FAILED);
        assertEquals(IpnResponse.ALREADY_CONFIRMED, handler.handle(params("00")));
        verify(ledger, never()).settle(any(), any(), any(), any());
        verifyNoInteractions(grants);
    }

    @Test
    void success_settlesPaid_thenGrants_00() {
        assertEquals(IpnResponse.OK, handler.handle(params("00")));
        ArgumentCaptor<VnpFields> f = ArgumentCaptor.forClass(VnpFields.class);
        verify(ledger).settle(eq("T1"), eq(OrderStatus.PAID), eq(SettlementSource.IPN), f.capture());
        assertEquals("14000001", f.getValue().transactionNo());
        assertEquals("20261015093512", f.getValue().payDate());
        assertFalse(f.getValue().params().containsKey("vnp_SecureHash"), "audit copy must not keep the signature");
        verify(grants).grant(argThat(o -> o.getStatus() == OrderStatus.PAID));
    }

    @Test
    void failureCode_settlesFailed_00_noGrant() {
        assertEquals(IpnResponse.OK, handler.handle(params("24")));
        verify(ledger).settle(eq("T1"), eq(OrderStatus.FAILED), eq(SettlementSource.IPN), any());
        verifyNoInteractions(grants);
    }

    @Test
    void successCodeButTransactionStatusNot00_treatedAsFailed() {
        Map<String, String> p = params("00"); p.put("vnp_TransactionStatus", "02");
        assertEquals(IpnResponse.OK, handler.handle(p));
        verify(ledger).settle(eq("T1"), eq(OrderStatus.FAILED), any(), any());
    }

    @Test
    void concurrentLoser_settleReturnsNull_02() {
        when(ledger.settle(eq("T1"), any(), any(), any())).thenReturn(null);
        assertEquals(IpnResponse.ALREADY_CONFIRMED, handler.handle(params("00")));
        verifyNoInteractions(grants);
    }

    @Test
    void handle_grantThrows_still00_orderPaid() {
        when(grants.grant(any())).thenThrow(new RuntimeException("mongo down"));
        assertEquals(IpnResponse.OK, handler.handle(params("00")));
        verify(ledger).settle(eq("T1"), eq(OrderStatus.PAID), any(), any());
    }

    @Test
    void unexpectedException_99() {
        when(ledger.findByTxnRef("T1")).thenThrow(new RuntimeException("boom"));
        assertEquals(IpnResponse.UNKNOWN_ERROR, handler.handle(params("00")));
    }

    @Test
    void missingTxnRef_01() {
        Map<String, String> p = params("00"); p.remove("vnp_TxnRef");
        assertEquals(IpnResponse.ORDER_NOT_FOUND, handler.handle(p));
    }

    @Test
    void lateSuccess_onExpiredOrder_02_recordsEvidence_noGrant() {
        pending.setStatus(OrderStatus.EXPIRED);
        Map<String, String> p = params("00");
        assertEquals(IpnResponse.ALREADY_CONFIRMED, handler.handle(p));
        verify(ledger).recordLateSuccess(eq("T1"), argThat(m -> "00".equals(m.get("vnp_ResponseCode"))));
        verify(ledger, never()).settle(any(), any(), any(), any());
        verifyNoInteractions(grants);
    }

    @Test
    void failureIpn_onExpiredOrder_noLateSuccessEvidence() {
        pending.setStatus(OrderStatus.EXPIRED);
        assertEquals(IpnResponse.ALREADY_CONFIRMED, handler.handle(params("24")));
        verify(ledger, never()).recordLateSuccess(any(), any());
    }
}
