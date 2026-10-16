package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.SettlementSource;
import com.example.ie213backend.domain.model.PaymentOrder;
import com.example.ie213backend.repository.PaymentOrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.LocalDateTime;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OrderLedgerTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }

    MongoTemplate mongo;
    PaymentOrderRepository repo;
    OrderLedger ledger;

    @BeforeEach
    void setUp() {
        mongo = mock(MongoTemplate.class);
        repo = mock(PaymentOrderRepository.class);
        when(repo.insert(any(PaymentOrder.class))).thenAnswer(i -> i.getArgument(0));
        ledger = new OrderLedger(mongo, repo, 15);
    }

    @Test
    void newTxnRef_is12UppercaseAlnum_andRandom() {
        String a = OrderLedger.newTxnRef(), b = OrderLedger.newTxnRef();
        assertTrue(a.matches("[0-9A-Z]{12}"), a);
        assertNotEquals(a, b);
    }

    @Test
    void create_pendingOrder_withTtlExpiry() {
        PaymentOrder o = ledger.create("650000000000000000000a01", Plans.PRO, 400_000L, "Mobidrawer PRO", null, "vn", "127.0.0.1");
        assertEquals(OrderStatus.PENDING, o.getStatus());
        assertEquals(400_000L, o.getAmountVnd());
        assertEquals(o.getCreatedAt().plusMinutes(15), o.getExpiresAt());
        assertEquals("650000000000000000000a01", o.getUserId());
        assertNull(o.getGrantedUserPlanId());
        verify(repo).insert(o);
    }

    @Test
    void create_retriesOnceOnDuplicateTxnRef() {
        when(repo.insert(any(PaymentOrder.class)))
                .thenThrow(new DuplicateKeyException("dup"))
                .thenAnswer(i -> i.getArgument(0));
        PaymentOrder o = ledger.create("u", Plans.PRO, 1L, "x", null, null, null);
        ArgumentCaptor<PaymentOrder> cap = ArgumentCaptor.forClass(PaymentOrder.class);
        verify(repo, times(2)).insert(cap.capture());
        assertNotEquals(cap.getAllValues().get(0).getTxnRef(), cap.getAllValues().get(1).getTxnRef());
        assertEquals(cap.getAllValues().get(1).getTxnRef(), o.getTxnRef());
    }

    @Test
    void create_secondDuplicate_propagates() {
        when(repo.insert(any(PaymentOrder.class))).thenThrow(new DuplicateKeyException("dup"));
        assertThrows(DuplicateKeyException.class, () -> ledger.create("u", Plans.PRO, 1L, "x", null, null, null));
    }

    @Test
    void settle_filtersOnPendingOnly_andSetsFields() {
        PaymentOrder updated = PaymentOrder.builder().txnRef("T1").status(OrderStatus.PAID).build();
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(PaymentOrder.class))).thenReturn(updated);

        PaymentOrder r = ledger.settle("T1", OrderStatus.PAID, SettlementSource.IPN,
                new VnpFields("14000001", "NCB", "00", "20261015093000", Map.of("vnp_TxnRef", "T1")));

        assertSame(updated, r);
        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> u = ArgumentCaptor.forClass(Update.class);
        verify(mongo).findAndModify(q.capture(), u.capture(), any(FindAndModifyOptions.class), eq(PaymentOrder.class));
        // Raw (unconverted) Documents: enums/LocalDateTime are not BSON-encodable here, so assert on values.
        org.bson.Document query = q.getValue().getQueryObject();
        assertEquals("T1", query.get("txnRef"));
        assertEquals(OrderStatus.PENDING, query.get("status"));
        org.bson.Document set = (org.bson.Document) u.getValue().getUpdateObject().get("$set");
        assertEquals(OrderStatus.PAID, set.get("status"));
        assertEquals(SettlementSource.IPN, set.get("settledBy"));
        assertEquals("14000001", set.get("vnpTransactionNo"));
        assertTrue(set.containsKey("paidAt"), set.toString());
    }

    @Test
    void settle_failed_hasNoPaidAt() {
        when(mongo.findAndModify(any(Query.class), any(Update.class), any(FindAndModifyOptions.class), eq(PaymentOrder.class))).thenReturn(null);
        assertNull(ledger.settle("T1", OrderStatus.FAILED, SettlementSource.RECONCILE, new VnpFields(null, null, "24", null, Map.of())));
        ArgumentCaptor<Update> u = ArgumentCaptor.forClass(Update.class);
        verify(mongo).findAndModify(any(Query.class), u.capture(), any(FindAndModifyOptions.class), eq(PaymentOrder.class));
        org.bson.Document set = (org.bson.Document) u.getValue().getUpdateObject().get("$set");
        assertEquals(OrderStatus.FAILED, set.get("status"));
        assertFalse(set.containsKey("paidAt"), set.toString());
    }

    @Test
    void settle_rejectsPendingAsTarget() {
        assertThrows(IllegalArgumentException.class,
                () -> ledger.settle("T1", OrderStatus.PENDING, SettlementSource.IPN, new VnpFields(null, null, null, null, Map.of())));
    }

    @Test
    void markGranted_updatesOnlyGrantedUserPlanId() {
        ledger.markGranted("T1", "plan-1");
        ArgumentCaptor<Update> u = ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateFirst(any(Query.class), u.capture(), eq(PaymentOrder.class));
        org.bson.Document set = (org.bson.Document) u.getValue().getUpdateObject().get("$set");
        assertEquals("plan-1", set.get("grantedUserPlanId"));
    }

    @Test
    void sweepQueries_limitAndFilter() {
        ledger.findStalePending(LocalDateTime.of(2026, 10, 15, 9, 0), 50);
        ledger.findPaidUngranted(50);
        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        verify(mongo, times(2)).find(q.capture(), eq(PaymentOrder.class));
        org.bson.Document stale = q.getAllValues().get(0).getQueryObject();
        assertEquals(OrderStatus.PENDING, stale.get("status"));
        assertTrue(stale.containsKey("createdAt"), stale.toString());
        assertEquals(50, q.getAllValues().get(0).getLimit());
        org.bson.Document ungranted = q.getAllValues().get(1).getQueryObject();
        assertEquals(OrderStatus.PAID, ungranted.get("status"));
        assertTrue(ungranted.containsKey("grantedUserPlanId"), ungranted.toString());
    }

    @Test
    void recordLateSuccess_filtersTerminalNonPaid_andStoresParamsWithoutHash() {
        ledger.recordLateSuccess("T1", Map.of("vnp_TxnRef", "T1", "vnp_ResponseCode", "00",
                "vnp_SecureHash", "sig", "vnp_SecureHashType", "HmacSHA512"));
        ArgumentCaptor<Query> q = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> u = ArgumentCaptor.forClass(Update.class);
        verify(mongo).updateFirst(q.capture(), u.capture(), eq(PaymentOrder.class));
        org.bson.Document query = q.getValue().getQueryObject();
        assertEquals("T1", query.get("txnRef"));
        org.bson.Document status = (org.bson.Document) query.get("status");
        assertEquals(java.util.List.of(OrderStatus.EXPIRED, OrderStatus.FAILED), new java.util.ArrayList<>((java.util.Collection<?>) status.get("$in")));
        org.bson.Document set = (org.bson.Document) u.getValue().getUpdateObject().get("$set");
        assertNotNull(set.get("lateSuccessAt"));
        @SuppressWarnings("unchecked") Map<String, String> params = (Map<String, String>) set.get("lateSuccessParams");
        assertEquals("00", params.get("vnp_ResponseCode"));
        assertFalse(params.containsKey("vnp_SecureHash"));
        assertFalse(params.containsKey("vnp_SecureHashType"));
        assertFalse(set.containsKey("status"));
    }
}
