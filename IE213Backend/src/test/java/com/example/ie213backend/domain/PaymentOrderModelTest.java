package com.example.ie213backend.domain;

import com.example.ie213backend.domain.model.PaymentOrder;
import com.example.ie213backend.domain.model.UserPlans;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;

class PaymentOrderModelTest {
    @Test
    void paymentOrder_collectionAndUniqueTxnRef() throws Exception {
        assertEquals("payment_orders", PaymentOrder.class.getAnnotation(Document.class).collection());
        Field f = PaymentOrder.class.getDeclaredField("txnRef");
        Indexed idx = f.getAnnotation(Indexed.class);
        assertNotNull(idx, "txnRef must be @Indexed");
        assertTrue(idx.unique(), "txnRef index must be unique");
        assertEquals("order_txnref", idx.name());
    }

    @Test
    void userPlans_orderTxnRef_uniqueSparse() throws Exception {
        Indexed idx = UserPlans.class.getDeclaredField("orderTxnRef").getAnnotation(Indexed.class);
        assertNotNull(idx);
        assertTrue(idx.unique());
        assertTrue(idx.sparse(), "existing UserPlans have no orderTxnRef; index must be sparse");
    }

    @Test
    void orderStatus_hasFourStates_pendingIsOnlyOpenState() {
        assertArrayEquals(new OrderStatus[]{OrderStatus.PENDING, OrderStatus.PAID, OrderStatus.FAILED, OrderStatus.EXPIRED}, OrderStatus.values());
        assertTrue(OrderStatus.PENDING.isOpen());
        assertFalse(OrderStatus.PAID.isOpen());
        assertFalse(OrderStatus.FAILED.isOpen());
        assertFalse(OrderStatus.EXPIRED.isOpen());
    }
}
