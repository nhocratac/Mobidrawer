package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.domain.model.UserPlans;
import com.example.ie213backend.mapper.UserPlanMapper;
import com.example.ie213backend.repository.UserPlansRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.NotificationService;
import com.example.ie213backend.service.UserService;
import com.example.ie213backend.service.payment.OrderLedger;
import com.example.ie213backend.service.payment.SchedulerLock;
import com.example.ie213backend.service.payment.VNPayGateway;
import com.example.ie213backend.utils.VNPayUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ExpiryMembershipTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }
    static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 15, 10, 0);

    UserPlansRepository plans = mock(UserPlansRepository.class);
    UserService users = mock(UserService.class);
    EmailService emails = mock(EmailService.class);
    NotificationService notifications = mock(NotificationService.class);
    SchedulerLock lock = mock(SchedulerLock.class);
    VNPayServiceImpl service = new VNPayServiceImpl(mock(VNPayUtil.class), plans, mock(UserPlanMapper.class), users, emails, notifications,
            mock(OrderLedger.class), mock(VNPayGateway.class), lock, Clock.fixed(NOW.atZone(OrderLedger.VN).toInstant(), OrderLedger.VN));

    @BeforeEach
    void setUp() {
        when(lock.tryAcquire("plan-expiry", 3000)).thenReturn(true);
        when(plans.findByExpiresAtBetweenAndActiveAndNotified(any(), any(), anyBoolean(), anyBoolean())).thenReturn(List.of());
        when(plans.findByExpiresAtBeforeAndActive(any(), anyBoolean())).thenReturn(List.of());
    }

    @Test
    void expiringSoonWindow_isNowToNowPlus3Days() {
        service.checkExpiringMemberships();
        verify(plans).findByExpiresAtBetweenAndActiveAndNotified(NOW, NOW.plusDays(3), true, false);
        verify(plans).findByExpiresAtBeforeAndActive(NOW, true);
    }

    @Test
    void noLock_noWork() {
        when(lock.tryAcquire("plan-expiry", 3000)).thenReturn(false);
        service.checkExpiringMemberships();
        verifyNoInteractions(plans);
    }

    @Test
    void expired_missingUser_skipped_batchContinues() {
        UserPlans gone = UserPlans.builder().id("p1").userId("deleted").active(true).expiresAt(NOW.minusDays(1)).build();
        UserPlans ok = UserPlans.builder().id("p2").userId("alive").active(true).expiresAt(NOW.minusDays(1)).build();
        when(plans.findByExpiresAtBeforeAndActive(NOW, true)).thenReturn(List.of(gone, ok));
        when(users.getUserById("deleted")).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        User alive = new User(); alive.setId("alive"); alive.setPlan(Plans.PRO); alive.setUserPlansId("p2");
        when(users.getUserById("alive")).thenReturn(alive);
        service.checkExpiringMemberships();
        verify(users).saveUser(argThat(u -> u.getPlan() == Plans.FREE && u.getUserPlansId() == null));
        verify(plans).save(argThat(p -> "p2".equals(p.getId()) && !p.isActive()));
        verify(plans, never()).save(argThat(p -> "p1".equals(p.getId())));
    }

    @Test
    void expiringSoon_marksNotified_andNotifies() {
        UserPlans soon = UserPlans.builder().id("p3").userId("u3").active(true).notified(false).expiresAt(NOW.plusDays(1)).build();
        when(plans.findByExpiresAtBetweenAndActiveAndNotified(NOW, NOW.plusDays(3), true, false)).thenReturn(List.of(soon));
        User u = new User(); u.setId("u3"); u.setEmail("e"); when(users.getUserById("u3")).thenReturn(u);
        service.checkExpiringMemberships();
        verify(plans).save(argThat(p -> "p3".equals(p.getId()) && p.isNotified()));
        verify(notifications).sendNotification(anyString(), anyString(), eq(List.of("u3")));
        verify(emails).sendRenewPlanEmail(eq("e"), any(), any(), anyString());
    }
}
