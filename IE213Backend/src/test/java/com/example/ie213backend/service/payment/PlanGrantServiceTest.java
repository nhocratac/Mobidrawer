package com.example.ie213backend.service.payment;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.model.PaymentOrder;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.domain.model.UserPlans;
import com.example.ie213backend.repository.UserPlansRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.NotificationService;
import com.example.ie213backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;
import org.springframework.dao.DuplicateKeyException;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PlanGrantServiceTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }

    static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 15, 10, 0, 0);
    static final String USER = "650000000000000000000a01";

    UserPlansRepository plans = mock(UserPlansRepository.class);
    UserService users = mock(UserService.class);
    NotificationService notifications = mock(NotificationService.class);
    EmailService emails = mock(EmailService.class);
    OrderLedger ledger = mock(OrderLedger.class);
    Clock clock = Clock.fixed(NOW.atZone(OrderLedger.VN).toInstant(), OrderLedger.VN);
    PlanGrantService svc;
    User user;

    PaymentOrder paid(String txn) {
        return PaymentOrder.builder().txnRef(txn).userId(USER).plan(Plans.PRO).amountVnd(400_000L).status(OrderStatus.PAID).build();
    }

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(USER);
        user.setEmail("a@b.c");
        user.setPlan(Plans.FREE);
        when(users.getUserById(USER)).thenReturn(user);
        when(users.saveUser(any())).thenAnswer(i -> i.getArgument(0));
        when(plans.insert(any(UserPlans.class))).thenAnswer(i -> { UserPlans p = i.getArgument(0); p.setId("plan-new"); return p; });
        when(plans.findFirstByUserIdAndActiveTrueOrderByExpiresAtDesc(USER)).thenReturn(Optional.empty());
        svc = new PlanGrantService(plans, users, notifications, emails, ledger, 30, clock);
    }

    @Test
    void grant_newPlan_30DaysFromNow() {
        UserPlans p = svc.grant(paid("T1"));
        assertEquals(NOW.plusDays(30), p.getExpiresAt());
        assertEquals(NOW, p.getCreatedAt());
        assertEquals("T1", p.getOrderTxnRef());
        assertEquals("T1", p.getOrderCode());
        assertTrue(p.isActive()); assertFalse(p.isNotified());
        assertEquals(Plans.PRO, user.getPlan());
        assertEquals("plan-new", user.getUserPlansId());
        InOrder order = inOrder(users, ledger);
        order.verify(users).saveUser(user);
        order.verify(ledger).markGranted("T1", "plan-new");
        verify(notifications).sendNotification(anyString(), anyString(), eq(List.of(USER)));
        verify(emails).sendConfirmPaymentEmail("a@b.c", "T1");
    }

    @Test
    void grant_activeSamePlan_stacksOnCurrentExpiry() {
        UserPlans cur = UserPlans.builder().id("plan-old").userId(USER).plan(Plans.PRO).active(true).expiresAt(NOW.plusDays(10)).build();
        when(plans.findFirstByUserIdAndActiveTrueOrderByExpiresAtDesc(USER)).thenReturn(Optional.of(cur));
        when(plans.findByUserIdAndActiveTrue(USER)).thenReturn(List.of(cur));
        UserPlans p = svc.grant(paid("T2"));
        assertEquals(NOW.plusDays(40), p.getExpiresAt());
        assertFalse(cur.isActive(), "old plan deactivated");
        verify(plans).save(cur);
    }

    @Test
    void grant_expiredCurrent_startsNow() {
        UserPlans cur = UserPlans.builder().id("plan-old").userId(USER).plan(Plans.PRO).active(true).expiresAt(NOW.minusDays(1)).build();
        when(plans.findFirstByUserIdAndActiveTrueOrderByExpiresAtDesc(USER)).thenReturn(Optional.of(cur));
        when(plans.findByUserIdAndActiveTrue(USER)).thenReturn(List.of(cur));
        assertEquals(NOW.plusDays(30), svc.grant(paid("T3")).getExpiresAt());
        assertFalse(cur.isActive());
    }

    @Test
    void grant_differentPlan_startsNow() {
        UserPlans cur = UserPlans.builder().id("plan-old").userId(USER).plan(Plans.ENTERPRISE).active(true).expiresAt(NOW.plusDays(100)).build();
        when(plans.findFirstByUserIdAndActiveTrueOrderByExpiresAtDesc(USER)).thenReturn(Optional.of(cur));
        when(plans.findByUserIdAndActiveTrue(USER)).thenReturn(List.of(cur));
        assertEquals(NOW.plusDays(30), svc.grant(paid("T4")).getExpiresAt());
    }

    @Test
    void grant_alreadyGranted_shortCircuits() {
        PaymentOrder o = paid("T5"); o.setGrantedUserPlanId("plan-done");
        UserPlans done = UserPlans.builder().id("plan-done").build();
        when(plans.findById("plan-done")).thenReturn(Optional.of(done));
        assertSame(done, svc.grant(o));
        verify(plans, never()).insert(any(UserPlans.class));
        verify(users, never()).saveUser(any());
    }

    @Test
    void grant_duplicateOrderTxnRef_reusesExistingAndFinishes() {
        when(plans.insert(any(UserPlans.class))).thenThrow(new DuplicateKeyException("dup"));
        UserPlans existing = UserPlans.builder().id("plan-prev").userId(USER).plan(Plans.PRO).orderTxnRef("T6").expiresAt(NOW.plusDays(30)).active(true).build();
        when(plans.findByOrderTxnRef("T6")).thenReturn(Optional.of(existing));
        UserPlans p = svc.grant(paid("T6"));
        assertSame(existing, p);
        verify(ledger).markGranted("T6", "plan-prev");
        assertEquals("plan-prev", user.getUserPlansId());
    }

    @Test
    void grant_retryAfterCrash_deactivatesOtherActiveButKeepsInserted() {
        UserPlans stale = UserPlans.builder().id("plan-stale").userId(USER).plan(Plans.PRO).active(true).expiresAt(NOW.plusDays(5)).build();
        UserPlans inserted = UserPlans.builder().id("plan-new").userId(USER).plan(Plans.PRO).active(true).expiresAt(NOW.plusDays(30)).build();
        when(plans.findByUserIdAndActiveTrue(USER)).thenReturn(List.of(stale, inserted));
        UserPlans p = svc.grant(paid("T9"));
        assertEquals("plan-new", p.getId());
        assertFalse(stale.isActive());
        assertTrue(inserted.isActive());
        verify(plans).save(stale);
        verify(plans, never()).save(inserted);
    }

    @Test
    void grant_rejectsUnpaidOrder() {
        PaymentOrder o = paid("T7"); o.setStatus(OrderStatus.PENDING);
        assertThrows(IllegalStateException.class, () -> svc.grant(o));
    }

    @Test
    void grant_emailFailure_doesNotThrow() {
        doThrow(new RuntimeException("smtp down")).when(emails).sendConfirmPaymentEmail(anyString(), anyString());
        assertDoesNotThrow(() -> svc.grant(paid("T8")));
        verify(ledger).markGranted(eq("T8"), anyString());
    }
}
