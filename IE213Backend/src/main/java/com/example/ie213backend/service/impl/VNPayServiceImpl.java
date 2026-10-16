package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.SettlementSource;
import com.example.ie213backend.domain.UserRoles;
import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.OrderStatusDto;
import com.example.ie213backend.domain.dto.PaymentDto.UserPlansDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.PaymentOrder;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.domain.model.UserPlans;
import com.example.ie213backend.mapper.UserPlanMapper;
import com.example.ie213backend.repository.UserPlansRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.NotificationService;
import com.example.ie213backend.service.UserService;
import com.example.ie213backend.service.VNPayService;
import com.example.ie213backend.service.payment.OrderLedger;
import com.example.ie213backend.service.payment.SchedulerLock;
import com.example.ie213backend.service.payment.VNPayGateway;
import com.example.ie213backend.service.payment.VnpFields;
import com.example.ie213backend.utils.VNPayUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class VNPayServiceImpl implements VNPayService {
    // Server-side price (VND) per purchasable plan; mirrors client Pricing page (PRO = 400.000 VNĐ).
    static final Map<Plans, Long> PLAN_PRICES_VND = Map.of(Plans.PRO, 400_000L);
    static final String EXPIRY_LOCK = "plan-expiry";
    static final int EXPIRY_LEASE_SECONDS = 3000;
    private static final DateTimeFormatter HUMAN = DateTimeFormatter.ofPattern("HH:mm:ss dd-MM-yyyy");

    private final VNPayUtil vnPayUtil;               // kept for getIpAddress in the controller; config lives in VNPayGateway
    private final UserPlansRepository userPlansRepository;
    private final UserPlanMapper userPlanMapper;
    private final UserService userService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final OrderLedger ledger;
    private final VNPayGateway gateway;
    private final SchedulerLock schedulerLock;
    private final Clock clock;

    @Override
    public String createPaymentUrl(CreatePaymentDto dto, String userId, String clientIp) {
        Long price = PLAN_PRICES_VND.get(dto.getPlan());
        if (price == null) throw new IllegalArgumentException("Plan không hỗ trợ thanh toán: " + dto.getPlan());
        PaymentOrder order = ledger.create(userId, dto.getPlan(), price, dto.getOrderInfo(), dto.getBankCode(), dto.getLanguage(), clientIp);
        try {
            return gateway.buildPayUrl(order);
        } catch (RuntimeException e) {
            ledger.settle(order.getTxnRef(), OrderStatus.FAILED, SettlementSource.IPN,
                    new VnpFields(null, null, "LOCAL_ERROR", null, Map.of("error", String.valueOf(e.getMessage()))));
            throw e;
        }
    }

    @Override
    public OrderStatusDto getOrderStatus(String txnRef, UserDto actor) {
        PaymentOrder o = ledger.findByTxnRef(txnRef)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đơn hàng: " + txnRef));
        boolean owner = actor != null && Objects.equals(o.getUserId(), actor.getId());
        boolean admin = actor != null && actor.getRole() == UserRoles.ADMIN;
        if (!owner && !admin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem đơn hàng này");
        return OrderStatusDto.builder().txnRef(o.getTxnRef()).status(o.getStatus()).plan(o.getPlan()).amountVnd(o.getAmountVnd())
                .createdAt(o.getCreatedAt()).paidAt(o.getPaidAt()).grantedUserPlanId(o.getGrantedUserPlanId())
                .vnpResponseCode(o.getVnpResponseCode()).build();
    }

    @Override
    public UserPlansDto getUserPlanInfo(String userPlanId, UserDto user) {
        UserPlans userPlans = userPlansRepository.findById(userPlanId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy plan với id: " + userPlanId));
        boolean isOwner = user != null && Objects.equals(userPlans.getUserId(), user.getId());
        boolean isAdmin = user != null && user.getRole() == UserRoles.ADMIN;
        if (!isOwner && !isAdmin) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem plan này");
        return userPlanMapper.toDto(userPlans);
    }

    @Override
    @Scheduled(fixedDelayString = "${payment.expiry.delay-ms:3600000}", initialDelayString = "${payment.expiry.initial-delay-ms:30000}")
    public void checkExpiringMemberships() {
        if (!schedulerLock.tryAcquire(EXPIRY_LOCK, EXPIRY_LEASE_SECONDS)) return;
        LocalDateTime now = LocalDateTime.now(clock);
        List<UserPlans> expiringSoon = userPlansRepository.findByExpiresAtBetweenAndActiveAndNotified(now, now.plusDays(3), true, false);
        List<UserPlans> expired = userPlansRepository.findByExpiresAtBeforeAndActive(now, true);
        expiringSoon.forEach(this::notifyExpiringSoon);
        expired.forEach(this::downgradeExpired);
    }

    private void notifyExpiringSoon(UserPlans plan) {
        try {
            String until = plan.getExpiresAt().format(HUMAN);
            User user = userService.getUserById(plan.getUserId());
            plan.setNotified(true);
            userPlansRepository.save(plan);
            notificationService.sendNotification("Plan sắp hết hạn",
                    "Plan của bạn sắp hết hạn vào ngày " + until + " .Hãy gia hạn để sử dụng không bị gián đoạn!", List.of(plan.getUserId()));
            emailService.sendRenewPlanEmail(user.getEmail(), user.getFirstName(), user.getLastName(), until);
        } catch (RuntimeException e) {
            log.warn("expiry notice skipped for plan {} user {}: {}", plan.getId(), plan.getUserId(), e.getMessage());
        }
    }

    private void downgradeExpired(UserPlans plan) {
        try {
            String at = plan.getExpiresAt().format(HUMAN);
            User user = userService.getUserById(plan.getUserId());
            // The list was loaded before slow SMTP work; re-check against the live plan so a concurrent renewal wins.
            UserPlans live = userPlansRepository.findById(plan.getId()).orElse(null);
            if (live == null || !live.isActive()) return;
            live.setActive(false);
            userPlansRepository.save(live);
            if (!plan.getId().equals(user.getUserPlansId())) return;
            user.setPlan(Plans.FREE);
            user.setUserPlansId(null);
            userService.saveUser(user);
            notificationService.sendNotification("Plan đã hết hạn", "Plan của bạn đã hết hạn vào ngày " + at, List.of(plan.getUserId()));
            emailService.sendExpiredPlanEmail(user.getEmail(), user.getFirstName(), user.getLastName(), at);
        } catch (RuntimeException e) {
            log.warn("downgrade skipped for plan {} user {}: {}", plan.getId(), plan.getUserId(), e.getMessage());
        }
    }
}
