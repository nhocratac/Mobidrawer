package com.example.ie213backend.service.payment;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

import static org.junit.jupiter.api.Assertions.*;

class VNPaySignerTest {
    final VNPaySigner signer = new VNPaySigner("secret");

    // openssl: printf 'vnp_Amount=40000000&vnp_Command=pay&vnp_TxnRef=ABC123XYZ789' | openssl dgst -sha512 -hmac secret
    static final String KAT = "20a54f15dfd4db261a96669013f92fbaa6ca6fec34e1d9433018a4dc2580ea453f341427393c2a06542d580a3d2cdc54cf4dbf53f4c15f4a59516db9afe867b6";

    @Test
    void sign_sortsKeys_skipsEmpty_matchesOpenssl() {
        Map<String, String> p = new HashMap<>();
        p.put("vnp_TxnRef", "ABC123XYZ789");
        p.put("vnp_Amount", "40000000");
        p.put("vnp_Command", "pay");
        p.put("vnp_BankCode", "");
        p.put("vnp_Locale", null);
        assertEquals("vnp_Amount=40000000&vnp_Command=pay&vnp_TxnRef=ABC123XYZ789", signer.hashData(p));
        assertEquals(KAT, signer.sign(p));
    }

    @Test
    void hashData_urlEncodesValues() {
        assertEquals("vnp_OrderInfo=Mobidrawer+PRO", signer.hashData(Map.of("vnp_OrderInfo", "Mobidrawer PRO")));
    }

    @Test
    void verify_acceptsOwnSignature_ignoresHashType() {
        Map<String, String> p = new TreeMap<>(Map.of("vnp_TxnRef", "ABC123XYZ789", "vnp_Amount", "40000000", "vnp_Command", "pay"));
        p.put("vnp_SecureHash", KAT);
        p.put("vnp_SecureHashType", "HmacSHA512");
        assertTrue(signer.verify(p));
    }

    @Test
    void verify_rejectsTamperedValue_missingHash_wrongLength() {
        Map<String, String> p = new HashMap<>(Map.of("vnp_TxnRef", "ABC123XYZ789", "vnp_Amount", "40000001", "vnp_Command", "pay"));
        p.put("vnp_SecureHash", KAT);
        assertFalse(signer.verify(p));
        p.remove("vnp_SecureHash");
        assertFalse(signer.verify(p));
        p.put("vnp_SecureHash", "abc");
        assertFalse(signer.verify(p));
    }

    @Test
    void verify_isCaseInsensitiveOnHex() {
        Map<String, String> p = new HashMap<>(Map.of("vnp_TxnRef", "ABC123XYZ789", "vnp_Amount", "40000000", "vnp_Command", "pay"));
        p.put("vnp_SecureHash", KAT.toUpperCase());
        assertTrue(signer.verify(p));
    }

    // openssl: printf 'req-1|2.1.0|querydr|TMN001|ABC123XYZ789|20261015093000|20261015094500|127.0.0.1|Mobidrawer PRO' | openssl dgst -sha512 -hmac secret
    @Test
    void signPipe_matchesOpenssl() {
        assertEquals("237a72a6d3da58297789e057b39640320b942d380336379ab2c640d1f64ed1c3a224f374300e253ac873ee3c2d03a177482a7f3f7a58079c5c13abefb2d46f61",
                signer.signPipe("req-1", "2.1.0", "querydr", "TMN001", "ABC123XYZ789", "20261015093000", "20261015094500", "127.0.0.1", "Mobidrawer PRO"));
    }

    @Test
    void hmac_throwsOnEmptySecret_insteadOfReturningEmptyString() {
        assertThrows(IllegalStateException.class, () -> new VNPaySigner("").hmac("x"));
    }
}
