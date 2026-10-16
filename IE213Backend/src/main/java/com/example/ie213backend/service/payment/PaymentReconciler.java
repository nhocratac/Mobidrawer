package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.SettlementSource;
import com.example.ie213backend.domain.model.PaymentOrder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDateTime;

/** Closes orders VNPay never called back for (querydr) and finishes grants that failed after PAID. Spec §5.4. */
@Slf4j
@Component
public class PaymentReconciler {
    static final String LOCK = "payment-reconcile";
    static final int LEASE_SECONDS = 240;
    static final int BATCH = 50;

    private final OrderLedger ledger;
    private final VNPayGateway gateway;
    private final PlanGrantService grants;
    private final SchedulerLock lock;
    private final Clock clock;
    private final int ttlMinutes;
    private final int graceMinutes;
    private final int pendingHorizonMinutes;

    public PaymentReconciler(OrderLedger ledger, VNPayGateway gateway, PlanGrantService grants, SchedulerLock lock, Clock clock,
                             @Value("${payment.order.ttl-minutes:15}") int ttlMinutes,
                             @Value("${payment.reconcile.grace-minutes:15}") int graceMinutes,
                             @Value("${payment.reconcile.pending-horizon-minutes:1440}") int pendingHorizonMinutes) {
        this.ledger = ledger; this.gateway = gateway; this.grants = grants; this.lock = lock; this.clock = clock;
        this.ttlMinutes = ttlMinutes; this.graceMinutes = graceMinutes; this.pendingHorizonMinutes = pendingHorizonMinutes;
    }

    @Scheduled(fixedDelayString = "${payment.reconcile.delay-ms:300000}", initialDelayString = "${payment.reconcile.initial-delay-ms:60000}")
    public void run() {
        if (!lock.tryAcquire(LOCK, LEASE_SECONDS)) return;
        int stale = reconcileStalePending();
        int granted = finishUngranted();
        if (stale + granted > 0) log.info("reconcile: settled {} stale orders, finished {} grants", stale, granted);
    }

    int reconcileStalePending() {
        LocalDateTime now = LocalDateTime.now(clock);
        LocalDateTime cutoff = now.minusMinutes((long) ttlMinutes + graceMinutes);
        LocalDateTime horizon = now.minusMinutes(pendingHorizonMinutes);
        int done = 0;
        for (PaymentOrder o : ledger.findStalePending(cutoff, BATCH)) {
            try {
                QueryDrResult r = gateway.queryDr(o);
                VnpFields f = new VnpFields(r.transactionNo(), r.bankCode(), r.responseCode(), r.payDate(), r.raw());
                PaymentOrder settled;
                if (!r.found()) {
                    settled = ledger.settle(o.getTxnRef(), OrderStatus.EXPIRED, SettlementSource.RECONCILE, f);
                } else if (r.isSuccess()) {
                    if (r.amount() != null && r.amount() == o.getAmountVnd() * 100) {
                        settled = ledger.settle(o.getTxnRef(), OrderStatus.PAID, SettlementSource.RECONCILE, f);
                        if (settled != null) grants.grant(settled);
                    } else {
                        log.error("reconcile {}: VNPay amount {} != expected {}", o.getTxnRef(), r.amount(), o.getAmountVnd() * 100);
                        settled = ledger.settle(o.getTxnRef(), OrderStatus.FAILED, SettlementSource.RECONCILE,
                                new VnpFields(r.transactionNo(), r.bankCode(), "AMOUNT_MISMATCH", r.payDate(), r.raw()));
                    }
                } else {
                    String ts = r.transactionStatus();
                    boolean nonFinal = "01".equals(ts) || "05".equals(ts) || "07".equals(ts);
                    if (nonFinal && o.getCreatedAt().isAfter(horizon)) {
                        log.info("reconcile {}: VNPay status {} not final, left PENDING", o.getTxnRef(), ts);
                        continue;
                    }
                    OrderStatus to = "01".equals(ts) ? OrderStatus.EXPIRED : OrderStatus.FAILED;
                    settled = ledger.settle(o.getTxnRef(), to, SettlementSource.RECONCILE, f);
                }
                if (settled != null) done++;
            } catch (GatewayException e) {
                log.warn("reconcile {}: gateway error, left PENDING: {}", o.getTxnRef(), e.getMessage());
            } catch (RuntimeException e) {
                log.error("reconcile {}: unexpected error", o.getTxnRef(), e);
            }
        }
        return done;
    }

    int finishUngranted() {
        int done = 0;
        for (PaymentOrder o : ledger.findPaidUngranted(BATCH)) {
            try {
                grants.grant(o);
                done++;
            } catch (RuntimeException e) {
                log.error("reconcile {}: grant retry failed", o.getTxnRef(), e);
            }
        }
        return done;
    }
}
