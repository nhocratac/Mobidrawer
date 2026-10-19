package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.SettlementSource;
import com.example.ie213backend.domain.model.PaymentOrder;
import com.example.ie213backend.repository.PaymentOrderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * The only writer of payment_orders. settle() is the single atomic PENDING -> terminal transition
 * (findAndModify filtered on status=PENDING), so concurrent IPN/reconcile calls cannot both win.
 */
@Service
public class OrderLedger {
    public static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final SecureRandom RNG = new SecureRandom();

    private final MongoTemplate mongo;
    private final PaymentOrderRepository repo;
    private final int ttlMinutes;

    public OrderLedger(MongoTemplate mongo, PaymentOrderRepository repo,
                       @Value("${payment.order.ttl-minutes:15}") int ttlMinutes) {
        this.mongo = mongo;
        this.repo = repo;
        this.ttlMinutes = ttlMinutes;
    }

    public static LocalDateTime nowVn() { return LocalDateTime.now(VN); }

    static String newTxnRef() {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) sb.append(ALPHABET.charAt(RNG.nextInt(ALPHABET.length())));
        return sb.toString();
    }

    public PaymentOrder create(String userId, Plans plan, long amountVnd, String orderInfo,
                               String bankCode, String locale, String clientIp) {
        LocalDateTime now = nowVn();
        PaymentOrder.PaymentOrderBuilder b = PaymentOrder.builder()
                .userId(userId).plan(plan).amountVnd(amountVnd).status(OrderStatus.PENDING)
                .createdAt(now).expiresAt(now.plusMinutes(ttlMinutes)).updatedAt(now)
                .orderInfo(orderInfo).bankCodeRequested(bankCode).locale(locale).clientIp(clientIp);
        try {
            return repo.insert(b.txnRef(newTxnRef()).build());
        } catch (DuplicateKeyException first) {
            // 36^12 space: a collision is a once-in-a-lifetime event; one retry is plenty.
            return repo.insert(b.txnRef(newTxnRef()).build());
        }
    }

    public Optional<PaymentOrder> findByTxnRef(String txnRef) { return repo.findByTxnRef(txnRef); }

    /** @return updated order, or null when it was not PENDING any more (or unknown). */
    public PaymentOrder settle(String txnRef, OrderStatus to, SettlementSource by, VnpFields f) {
        if (to == null || to.isOpen()) throw new IllegalArgumentException("settle target must be terminal, got " + to);
        LocalDateTime now = nowVn();
        Update u = new Update().set("status", to).set("settledBy", by).set("updatedAt", now)
                .set("vnpTransactionNo", f.transactionNo()).set("vnpBankCode", f.bankCode())
                .set("vnpResponseCode", f.responseCode()).set("vnpPayDate", f.payDate())
                .set("lastCallbackParams", f.params());
        if (to == OrderStatus.PAID) u.set("paidAt", now);
        Query q = Query.query(Criteria.where("txnRef").is(txnRef).and("status").is(OrderStatus.PENDING));
        return mongo.findAndModify(q, u, FindAndModifyOptions.options().returnNew(true), PaymentOrder.class);
    }

    public void markGranted(String txnRef, String userPlanId) {
        mongo.updateFirst(Query.query(Criteria.where("txnRef").is(txnRef)),
                new Update().set("grantedUserPlanId", userPlanId).set("updatedAt", nowVn()), PaymentOrder.class);
    }

    /** Evidence that VNPay reported success for an order we already closed as EXPIRED/FAILED. Status is left untouched. */
    public void recordLateSuccess(String txnRef, Map<String, String> params) {
        Map<String, String> audit = VnpFields.stripHash(params);
        Query q = Query.query(Criteria.where("txnRef").is(txnRef)
                .and("status").in(OrderStatus.EXPIRED, OrderStatus.FAILED));
        mongo.updateFirst(q, new Update().set("lateSuccessParams", audit).set("lateSuccessAt", nowVn()), PaymentOrder.class);
    }

    public List<PaymentOrder> findStalePending(LocalDateTime createdBefore, int limit) {
        Query q = Query.query(Criteria.where("status").is(OrderStatus.PENDING).and("createdAt").lt(createdBefore))
                .with(Sort.by(Sort.Direction.ASC, "createdAt")).limit(limit);
        return mongo.find(q, PaymentOrder.class);
    }

    public List<PaymentOrder> findPaidUngranted(int limit) {
        Query q = Query.query(Criteria.where("status").is(OrderStatus.PAID).and("grantedUserPlanId").isNull())
                .with(Sort.by(Sort.Direction.ASC, "paidAt")).limit(limit);
        return mongo.find(q, PaymentOrder.class);
    }
}
