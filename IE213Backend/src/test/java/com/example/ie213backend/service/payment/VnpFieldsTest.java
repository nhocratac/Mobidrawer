package com.example.ie213backend.service.payment;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class VnpFieldsTest {
    private static final Map<String, String> RAW = Map.of(
            "vnp_TransactionNo", "123", "vnp_BankCode", "NCB", "vnp_ResponseCode", "00", "vnp_PayDate", "20261016101010",
            "vnp_SecureHash", "abc", "vnp_SecureHashType", "HmacSHA512");

    @Test
    void ofStripsHashKeysAndMapsFields() {
        VnpFields f = VnpFields.of(RAW);
        assertEquals("123", f.transactionNo());
        assertEquals("NCB", f.bankCode());
        assertEquals("00", f.responseCode());
        assertEquals("20261016101010", f.payDate());
        assertFalse(f.params().containsKey("vnp_SecureHash"));
        assertFalse(f.params().containsKey("vnp_SecureHashType"));
        assertEquals(4, f.params().size());
        assertTrue(VnpFields.of(null).params().isEmpty());
    }

    @Test
    void withResponseCodeKeepsTheRest() {
        VnpFields f = VnpFields.of(RAW).withResponseCode("AMOUNT_MISMATCH");
        assertEquals("AMOUNT_MISMATCH", f.responseCode());
        assertEquals("123", f.transactionNo());
        assertEquals("NCB", f.bankCode());
        assertEquals("20261016101010", f.payDate());
        assertEquals(4, f.params().size());
    }

    @Test
    void paidTruthTable() {
        assertTrue(VnpFields.paid("00", null));
        assertTrue(VnpFields.paid("00", "00"));
        assertFalse(VnpFields.paid("00", "02"));
        assertFalse(VnpFields.paid("97", "00"));
    }
}
