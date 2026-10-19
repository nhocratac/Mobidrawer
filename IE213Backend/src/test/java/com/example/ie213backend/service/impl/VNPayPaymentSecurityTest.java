package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.UserRoles;
import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.OrderStatusDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.PaymentOrder;
import com.example.ie213backend.domain.model.UserPlans;
import com.example.ie213backend.mapper.UserPlanMapper;
import com.example.ie213backend.repository.UserPlansRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.NotificationService;
import com.example.ie213backend.service.UserService;
import com.example.ie213backend.service.payment.OrderLedger;
import com.example.ie213backend.service.payment.SchedulerLock;
import com.example.ie213backend.service.payment.VNPayGateway;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Pure-JVM unit tests: server-side pricing, order created before the pay URL, no Redis,
 * order-status ownership, and GET /payments/{userPlanId} ownership.
 */
class VNPayPaymentSecurityTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }

    static final String USER_ID = "650000000000000000000a01";

    UserPlansRepository userPlansRepository = mock(UserPlansRepository.class);
    UserPlanMapper userPlanMapper = mock(UserPlanMapper.class);
    UserService userService = mock(UserService.class);
    OrderLedger ledger = mock(OrderLedger.class);
    VNPayGateway gateway = mock(VNPayGateway.class);
    VNPayServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VNPayServiceImpl(userPlansRepository, userPlanMapper, userService,
                mock(EmailService.class), mock(NotificationService.class), ledger, gateway, mock(SchedulerLock.class), Clock.systemUTC());
        when(ledger.create(anyString(), any(), anyLong(), anyString(), any(), any(), any())).thenAnswer(i ->
                PaymentOrder.builder().txnRef("ABC123XYZ789").userId(i.getArgument(0)).plan(i.getArgument(1))
                        .amountVnd(i.getArgument(2)).status(OrderStatus.PENDING).build());
        when(gateway.buildPayUrl(any())).thenReturn("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=40000000&vnp_TxnRef=ABC123XYZ789");
    }

    // ---- createPaymentUrl: server-side pricing, order first ----

    @Test
    void createPaymentUrl_pro_usesServerPriceNotClientAmount() {
        CreatePaymentDto dto = CreatePaymentDto.builder().plan(Plans.PRO).orderInfo("Mobidrawer PRO").build();
        String url = service.createPaymentUrl(dto, USER_ID, "127.0.0.1");
        verify(ledger).create(USER_ID, Plans.PRO, 400_000L, "Mobidrawer PRO", null, null, "127.0.0.1");
        assertTrue(url.contains("vnp_Amount=40000000"));
    }

    @Test
    void createPaymentUrl_nonPurchasablePlan_rejected_noOrder() {
        for (Plans p : new Plans[]{Plans.FREE, Plans.ENTERPRISE}) {
            CreatePaymentDto dto = CreatePaymentDto.builder().plan(p).orderInfo("x").build();
            assertThrows(IllegalArgumentException.class, () -> service.createPaymentUrl(dto, USER_ID, "127.0.0.1"));
        }
        verify(ledger, never()).create(any(), any(), anyLong(), any(), any(), any(), any());
    }

    @Test
    void createPaymentDto_json_clientAmountIgnored() throws Exception {
        CreatePaymentDto dto = new ObjectMapper().readValue("{\"plan\":\"PRO\",\"orderInfo\":\"x\",\"amount\":1}", CreatePaymentDto.class);
        assertEquals(Plans.PRO, dto.getPlan());
    }

    @Test
    void createPaymentUrl_gatewayFails_orderMarkedFailed() {
        when(gateway.buildPayUrl(any())).thenThrow(new IllegalStateException("no secret"));
        CreatePaymentDto dto = CreatePaymentDto.builder().plan(Plans.PRO).orderInfo("x").build();
        assertThrows(IllegalStateException.class, () -> service.createPaymentUrl(dto, USER_ID, "127.0.0.1"));
        verify(ledger).settle(eq("ABC123XYZ789"), eq(OrderStatus.FAILED), any(), argThat(f -> "LOCAL_ERROR".equals(f.responseCode())));
    }

    // ---- getOrderStatus: owner or ADMIN ----

    UserDto actor(String id, UserRoles role) { UserDto u = new UserDto(); u.setId(id); u.setRole(role); return u; }

    @Test
    void getOrderStatus_owner_ok_andNeverGrants() {
        when(ledger.findByTxnRef("T1")).thenReturn(Optional.of(PaymentOrder.builder().txnRef("T1").userId(USER_ID).plan(Plans.PRO)
                .amountVnd(400_000L).status(OrderStatus.PAID).paidAt(LocalDateTime.of(2026, 10, 15, 9, 35)).grantedUserPlanId("p1").build()));
        OrderStatusDto dto = service.getOrderStatus("T1", actor(USER_ID, UserRoles.USER));
        assertEquals(OrderStatus.PAID, dto.getStatus());
        assertEquals("p1", dto.getGrantedUserPlanId());
        verify(userPlansRepository, never()).insert(any(UserPlans.class));
        verify(userService, never()).saveUser(any());
    }

    @Test
    void getOrderStatus_otherUser_403_admin_ok_unknown_404() {
        when(ledger.findByTxnRef("T1")).thenReturn(Optional.of(PaymentOrder.builder().txnRef("T1").userId(USER_ID).status(OrderStatus.PENDING).build()));
        ResponseStatusException e = assertThrows(ResponseStatusException.class, () -> service.getOrderStatus("T1", actor("other", UserRoles.USER)));
        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
        assertEquals(OrderStatus.PENDING, service.getOrderStatus("T1", actor("admin", UserRoles.ADMIN)).getStatus());
        when(ledger.findByTxnRef("nope")).thenReturn(Optional.empty());
        assertEquals(HttpStatus.NOT_FOUND, assertThrows(ResponseStatusException.class, () -> service.getOrderStatus("nope", actor(USER_ID, UserRoles.USER))).getStatusCode());
    }

    // ---- getUserPlanInfo: unchanged behaviour ----

    @Test
    void getUserPlanInfo_otherUser_throws403() {
        when(userPlansRepository.findById("plan-1")).thenReturn(Optional.of(UserPlans.builder().id("plan-1").userId(USER_ID).build()));
        ResponseStatusException e = assertThrows(ResponseStatusException.class, () -> service.getUserPlanInfo("plan-1", actor("other", UserRoles.USER)));
        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
    }

    @Test
    void getUserPlanInfo_ownerAndAdmin_allowed() {
        when(userPlansRepository.findById("plan-1")).thenReturn(Optional.of(UserPlans.builder().id("plan-1").userId(USER_ID).build()));
        assertDoesNotThrow(() -> service.getUserPlanInfo("plan-1", actor(USER_ID, UserRoles.USER)));
        assertDoesNotThrow(() -> service.getUserPlanInfo("plan-1", actor("admin", UserRoles.ADMIN)));
    }
}
