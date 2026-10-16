package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.model.PaymentOrder;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.domain.model.UserPlans;
import com.example.ie213backend.repository.UserPlansRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.NotificationService;
import com.example.ie213backend.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Grants the plan for a PAID order. Idempotent: the unique UserPlans.orderTxnRef is the anchor,
 * every step after it converges on re-run, and order.grantedUserPlanId short-circuits.
 */
@Slf4j
@Service
public class PlanGrantService {
    private static final DateTimeFormatter HUMAN = DateTimeFormatter.ofPattern("HH:mm:ss dd-MM-yyyy");

    private final UserPlansRepository plans;
    private final UserService users;
    private final NotificationService notifications;
    private final EmailService emails;
    private final OrderLedger ledger;
    private final int durationDays;
    private final Clock clock;

    public PlanGrantService(UserPlansRepository plans, UserService users, NotificationService notifications,
                            EmailService emails, OrderLedger ledger,
                            @Value("${payment.plan.duration-days:30}") int durationDays, Clock clock) {
        this.plans = plans; this.users = users; this.notifications = notifications; this.emails = emails;
        this.ledger = ledger; this.durationDays = durationDays; this.clock = clock;
    }

    public UserPlans grant(PaymentOrder order) {
        if (order.getStatus() != OrderStatus.PAID) throw new IllegalStateException("grant requires PAID, got " + order.getStatus() + " for " + order.getTxnRef());
        if (order.getGrantedUserPlanId() != null) {
            Optional<UserPlans> done = plans.findById(order.getGrantedUserPlanId());
            if (done.isPresent()) return done.get();
        }
        LocalDateTime now = LocalDateTime.now(clock);
        UserPlans current = plans.findFirstByUserIdAndActiveTrueOrderByExpiresAtDesc(order.getUserId()).orElse(null);
        LocalDateTime start = (current != null && current.getPlan() == order.getPlan() && current.getExpiresAt() != null
                && current.getExpiresAt().isAfter(now)) ? current.getExpiresAt() : now;

        UserPlans granted;
        try {
            granted = plans.insert(UserPlans.builder()
                    .userId(order.getUserId()).plan(order.getPlan()).amount(order.getAmountVnd())
                    .createdAt(now).expiresAt(start.plusDays(durationDays))
                    .orderCode(order.getTxnRef()).orderTxnRef(order.getTxnRef())
                    .active(true).notified(false).build());
        } catch (DuplicateKeyException e) {
            // A previous attempt inserted it and then failed later; continue from there.
            granted = plans.findByOrderTxnRef(order.getTxnRef())
                    .orElseThrow(() -> new IllegalStateException("UserPlans for " + order.getTxnRef() + " exists but not found", e));
        }
        ledger.markGranted(order.getTxnRef(), granted.getId());

        if (current != null && !current.getId().equals(granted.getId())) {
            current.setActive(false);
            plans.save(current);
        }
        User user = users.getUserById(order.getUserId());
        user.setPlan(granted.getPlan());
        user.setUserPlansId(granted.getId());
        users.saveUser(user);

        String until = granted.getExpiresAt().format(HUMAN);
        try {
            notifications.sendNotification("Đăng kí thành công gói " + granted.getPlan(),
                    "Bạn đã đăng kí thành công gói " + granted.getPlan() + " với ngày hết hạn vào " + until, List.of(user.getId()));
        } catch (RuntimeException e) { log.warn("notification failed for order {}", order.getTxnRef(), e); }
        try {
            emails.sendConfirmPaymentEmail(user.getEmail(), order.getTxnRef());
        } catch (RuntimeException e) { log.warn("confirmation email failed for order {}", order.getTxnRef(), e); }
        return granted;
    }
}
