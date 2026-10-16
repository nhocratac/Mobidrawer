package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.SettlementSource;
import com.example.ie213backend.domain.model.PaymentOrder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * VNPay IPN decision table (spec §5.2). Authenticates by HMAC only. settle(PAID) happens before grant():
 * a grant failure leaves a PAID order with grantedUserPlanId=null for the reconciler, and still answers 00.
 */
@Slf4j
@Service
public class PaymentIpnHandler {
    private final VNPaySigner signer;
    private final OrderLedger ledger;
    private final PlanGrantService grants;
    private final String tmnCode;

    public PaymentIpnHandler(VNPaySigner signer, OrderLedger ledger, PlanGrantService grants,
                             @Value("${vnp.tmn.code}") String tmnCode) {
        this.signer = signer; this.ledger = ledger; this.grants = grants; this.tmnCode = tmnCode;
    }

    public IpnResponse handle(Map<String, String> params) {
        String txnRef = params.get("vnp_TxnRef");
        try {
            if (!signer.verify(params)) return log(txnRef, params, IpnResponse.INVALID_SIGNATURE);
            if (txnRef == null || txnRef.isEmpty()) return log(txnRef, params, IpnResponse.ORDER_NOT_FOUND);
            Optional<PaymentOrder> found = ledger.findByTxnRef(txnRef);
            if (found.isEmpty()) return log(txnRef, params, IpnResponse.ORDER_NOT_FOUND);
            if (!tmnCode.equals(params.get("vnp_TmnCode"))) return log(txnRef, params, IpnResponse.INVALID_SIGNATURE);
            PaymentOrder order = found.get();
            if (!String.valueOf(order.getAmountVnd() * 100).equals(params.get("vnp_Amount"))) return log(txnRef, params, IpnResponse.INVALID_AMOUNT);
            boolean success = "00".equals(params.get("vnp_ResponseCode"))
                    && (params.get("vnp_TransactionStatus") == null || "00".equals(params.get("vnp_TransactionStatus")));
            if (!order.getStatus().isOpen()) {
                if (success && (order.getStatus() == OrderStatus.EXPIRED || order.getStatus() == OrderStatus.FAILED)) {
                    log.error("IPN {}: VNPay reports PAID but order is {} — manual refund/grant needed", txnRef, order.getStatus());
                    ledger.recordLateSuccess(txnRef, params);
                }
                return log(txnRef, params, IpnResponse.ALREADY_CONFIRMED);
            }
            Map<String, String> audit = new HashMap<>(params);
            audit.remove("vnp_SecureHash");
            audit.remove("vnp_SecureHashType");
            VnpFields fields = new VnpFields(params.get("vnp_TransactionNo"), params.get("vnp_BankCode"),
                    params.get("vnp_ResponseCode"), params.get("vnp_PayDate"), audit);
            PaymentOrder settled = ledger.settle(txnRef, success ? OrderStatus.PAID : OrderStatus.FAILED, SettlementSource.IPN, fields);
            if (settled == null) return log(txnRef, params, IpnResponse.ALREADY_CONFIRMED);
            if (success) {
                try {
                    grants.grant(settled);
                } catch (RuntimeException e) {
                    log.error("IPN {}: order PAID but grant failed; reconciler will retry", txnRef, e);
                }
            }
            return log(txnRef, params, IpnResponse.OK);
        } catch (RuntimeException e) {
            log.error("IPN {}: unexpected error", txnRef, e);
            return IpnResponse.UNKNOWN_ERROR;
        }
    }

    private IpnResponse log(String txnRef, Map<String, String> p, IpnResponse r) {
        log.info("IPN txnRef={} vnp_ResponseCode={} -> RspCode={} ({})", txnRef, p.get("vnp_ResponseCode"), r.rspCode(), r.message());
        return r;
    }
}
