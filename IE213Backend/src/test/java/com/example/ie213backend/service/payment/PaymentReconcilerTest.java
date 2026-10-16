package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.SettlementSource;
import com.example.ie213backend.domain.model.PaymentOrder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentReconcilerTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }

    static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 15, 10, 0);
    OrderLedger ledger = mock(OrderLedger.class);
    VNPayGateway gw = mock(VNPayGateway.class);
    PlanGrantService grants = mock(PlanGrantService.class);
    SchedulerLock lock = mock(SchedulerLock.class);
    Clock clock = Clock.fixed(NOW.atZone(OrderLedger.VN).toInstant(), OrderLedger.VN);
    PaymentReconciler rec = new PaymentReconciler(ledger, gw, grants, lock, clock, 15, 15, 1440);

    PaymentOrder stale(String txn) {
        return PaymentOrder.builder().txnRef(txn).userId("u").plan(Plans.PRO).amountVnd(400_000L).status(OrderStatus.PENDING).createdAt(NOW.minusMinutes(30)).build();
    }
    QueryDrResult dr(boolean found, String rc, String ts, Long amount) {
        return new QueryDrResult(found, rc, ts, amount, "14000001", "20261015093512", "NCB", Map.of());
    }

    @BeforeEach
    void setUp() {
        when(lock.tryAcquire("payment-reconcile", 240)).thenReturn(true);
        when(ledger.findPaidUngranted(anyInt())).thenReturn(List.of());
        when(ledger.settle(anyString(), any(), any(), any())).thenAnswer(i ->
                PaymentOrder.builder().txnRef(i.getArgument(0)).userId("u").plan(Plans.PRO).amountVnd(400_000L).status(i.getArgument(1)).build());
    }

    @Test
    void run_withoutLock_doesNothing() {
        when(lock.tryAcquire("payment-reconcile", 240)).thenReturn(false);
        rec.run();
        verifyNoInteractions(ledger, gw, grants);
    }

    @Test
    void stale_queriesWithCutoff_nowMinusTtlPlusGrace() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of());
        rec.run();
        verify(ledger).findStalePending(NOW.minusMinutes(30), 50);
    }

    @Test
    void stale_paidAtVnpay_settlesPaidAndGrants() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(stale("T1")));
        when(gw.queryDr(any())).thenReturn(dr(true, "00", "00", 40_000_000L));
        assertEquals(1, rec.reconcileStalePending());
        verify(ledger).settle(eq("T1"), eq(OrderStatus.PAID), eq(SettlementSource.RECONCILE), argThat(f -> "14000001".equals(f.transactionNo())));
        verify(grants).grant(argThat(o -> "T1".equals(o.getTxnRef()) && o.getStatus() == OrderStatus.PAID));
    }

    @Test
    void stale_paidButAmountMismatch_failedNoGrant() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(stale("T2")));
        when(gw.queryDr(any())).thenReturn(dr(true, "00", "00", 1_000L));
        rec.reconcileStalePending();
        verify(ledger).settle(eq("T2"), eq(OrderStatus.FAILED), eq(SettlementSource.RECONCILE), argThat(f -> "AMOUNT_MISMATCH".equals(f.responseCode())));
        verifyNoInteractions(grants);
    }

    @Test
    void stale_notFoundAtVnpay_expired() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(stale("T3")));
        when(gw.queryDr(any())).thenReturn(dr(false, "91", null, null));
        rec.reconcileStalePending();
        verify(ledger).settle(eq("T3"), eq(OrderStatus.EXPIRED), eq(SettlementSource.RECONCILE), any());
    }

    @Test
    void stale_failedAtVnpay_failed() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(stale("T4")));
        when(gw.queryDr(any())).thenReturn(dr(true, "00", "02", 40_000_000L));
        rec.reconcileStalePending();
        verify(ledger).settle(eq("T4"), eq(OrderStatus.FAILED), eq(SettlementSource.RECONCILE), any());
    }

    @Test
    void stale_gatewayError_leftPending_sweepContinues() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(stale("T5"), stale("T6")));
        when(gw.queryDr(argThat(o -> o != null && "T5".equals(o.getTxnRef())))).thenThrow(new GatewayException("timeout", null));
        when(gw.queryDr(argThat(o -> o != null && "T6".equals(o.getTxnRef())))).thenReturn(dr(false, "91", null, null));
        assertEquals(1, rec.reconcileStalePending());
        verify(ledger, never()).settle(eq("T5"), any(), any(), any());
        verify(ledger).settle(eq("T6"), eq(OrderStatus.EXPIRED), any(), any());
    }

    @Test
    void run_paidUngranted_grants() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of());
        PaymentOrder paid = PaymentOrder.builder().txnRef("T7").status(OrderStatus.PAID).build();
        when(ledger.findPaidUngranted(50)).thenReturn(List.of(paid));
        rec.run();
        verify(grants).grant(paid);
    }

    @Test
    void ungranted_oneFailureDoesNotStopOthers() {
        PaymentOrder a = PaymentOrder.builder().txnRef("A").status(OrderStatus.PAID).build();
        PaymentOrder b = PaymentOrder.builder().txnRef("B").status(OrderStatus.PAID).build();
        when(ledger.findPaidUngranted(50)).thenReturn(List.of(a, b));
        when(grants.grant(a)).thenThrow(new RuntimeException("boom"));
        assertEquals(1, rec.finishUngranted());
        verify(grants).grant(b);
    }

    @Test
    void stale_querydrBadChecksum97_gatewayThrows_noSettle_leftPending() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(stale("T8")));
        when(gw.queryDr(any())).thenThrow(new GatewayException("querydr rc=97", null));
        assertEquals(0, rec.reconcileStalePending());
        verify(ledger, never()).settle(any(), any(), any(), any());
        verifyNoInteractions(grants);
    }

    @Test
    void stale_nonFinalStatus_withinHorizon_leftPending() {
        for (String ts : List.of("01", "05", "07")) {
            when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(stale("N" + ts)));
            when(gw.queryDr(any())).thenReturn(dr(true, "00", ts, 40_000_000L));
            assertEquals(0, rec.reconcileStalePending());
        }
        verify(ledger, never()).settle(any(), any(), any(), any());
    }

    @Test
    void stale_status01_pastHorizon_expired() {
        PaymentOrder old = stale("OLD1"); old.setCreatedAt(NOW.minusMinutes(1441));
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(old));
        when(gw.queryDr(any())).thenReturn(dr(true, "00", "01", 40_000_000L));
        rec.reconcileStalePending();
        verify(ledger).settle(eq("OLD1"), eq(OrderStatus.EXPIRED), eq(SettlementSource.RECONCILE), any());
    }

    @Test
    void stale_status02_failedEvenWithinHorizon() {
        when(ledger.findStalePending(any(), anyInt())).thenReturn(List.of(stale("F2")));
        when(gw.queryDr(any())).thenReturn(dr(true, "00", "02", 40_000_000L));
        rec.reconcileStalePending();
        verify(ledger).settle(eq("F2"), eq(OrderStatus.FAILED), eq(SettlementSource.RECONCILE), any());
    }
}
