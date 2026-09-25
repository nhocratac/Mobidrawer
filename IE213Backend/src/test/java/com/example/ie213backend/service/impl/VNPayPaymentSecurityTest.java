package com.example.ie213backend.service.impl;

import com.example.ie213backend.configstore.ConfigService;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.UserRoles;
import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.PaymentRequest;
import com.example.ie213backend.domain.dto.PaymentDto.UserPlansDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.domain.model.UserPlans;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.mapper.UserPlanMapper;
import com.example.ie213backend.repository.UserPlansRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.NotificationService;
import com.example.ie213backend.service.UserService;
import com.example.ie213backend.utils.VNPayUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Pure-JVM unit tests (no Spring context, no Redis/Mongo) for the VNPay P0 fixes:
 * server-side pricing, vnp_Amount / vnp_TmnCode verification on return, atomic
 * (GETDEL) claim of the pending order, no NPE on a missing order, and ownership
 * check on GET /payments/{userPlanId}.
 */
class VNPayPaymentSecurityTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) does not yet officially recognize
        // Java 25 class file versions; this opts into its forward-compatible mode.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private static final String USER_ID = "user-1";
    private static final String TXN_REF = "12345678";
    private static final String TMN_CODE = "TMN001";
    private static final String SIGNATURE = "valid-signature";

    private VNPayUtil vnPayUtil;
    private UserPlansRepository userPlansRepository;
    private UserMapper userMapper;
    private RedisTemplate<String, PaymentRequest> redisTemplate;
    private ValueOperations<String, PaymentRequest> valueOps;
    private UserPlanMapper userPlanMapper;
    private UserService userService;
    private ConfigService configService;
    private VNPayServiceImpl service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        vnPayUtil = Mockito.mock(VNPayUtil.class);
        vnPayUtil.vnp_TmnCode = TMN_CODE;
        vnPayUtil.vnp_PayUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
        vnPayUtil.vnp_ReturnUrl = "https://example.test/payment-callback";
        vnPayUtil.vnp_HashSecret = "secret";
        when(vnPayUtil.getRandomNumber(8)).thenReturn(TXN_REF);
        when(vnPayUtil.getIpAddress(any())).thenReturn("127.0.0.1");
        when(vnPayUtil.hmacSHA512(anyString(), anyString())).thenReturn("hash");
        when(vnPayUtil.hashAllFields(any())).thenReturn(SIGNATURE);

        userPlansRepository = Mockito.mock(UserPlansRepository.class);
        userMapper = Mockito.mock(UserMapper.class);
        redisTemplate = Mockito.mock(RedisTemplate.class);
        valueOps = Mockito.mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        userPlanMapper = Mockito.mock(UserPlanMapper.class);
        userService = Mockito.mock(UserService.class);
        configService = Mockito.mock(ConfigService.class);
        when(configService.getInt(any())).thenReturn(30);

        service = new VNPayServiceImpl(vnPayUtil, userPlansRepository, userMapper, redisTemplate,
                userPlanMapper, userService, Mockito.mock(EmailService.class),
                Mockito.mock(NotificationService.class), configService);
    }

    // ---- createPaymentUrl: server-side pricing ----

    @Test
    void createPaymentUrl_pro_usesServerPriceNotClientAmount() {
        CreatePaymentDto dto = CreatePaymentDto.builder()
                .plan(Plans.PRO).orderInfo("upgrade").orderType("other").build();
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setAttribute("userId", USER_ID);

        String url = service.createPaymentUrl(dto, req);

        assertTrue(url.contains("vnp_Amount=40000000"), url);
        ArgumentCaptor<PaymentRequest> captor = ArgumentCaptor.forClass(PaymentRequest.class);
        verify(valueOps).set(eq(USER_ID + "+-+" + TXN_REF), captor.capture(), any(Duration.class));
        assertEquals(400_000L, captor.getValue().getAmount());
        assertEquals(Plans.PRO, captor.getValue().getPlan());
    }

    @Test
    void createPaymentUrl_nonPurchasablePlan_rejected() {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setAttribute("userId", USER_ID);

        for (Plans plan : new Plans[]{Plans.ENTERPRISE, Plans.FREE}) {
            CreatePaymentDto dto = CreatePaymentDto.builder()
                    .plan(plan).orderInfo("upgrade").orderType("other").build();
            assertThrows(IllegalArgumentException.class, () -> service.createPaymentUrl(dto, req));
        }
        verify(valueOps, never()).set(anyString(), any(), any(Duration.class));
    }

    // ---- validPayment ----

    @Test
    void validPayment_missingPendingOrder_throws400NotNpe() {
        when(valueOps.getAndDelete(anyString())).thenReturn(null);

        assertThrows(IllegalArgumentException.class, () -> service.validPayment(returnRequest("40000000", TMN_CODE)));
        verify(userPlansRepository, never()).save(any());
    }

    @Test
    void validPayment_amountMismatch_rejectedAndNoPlanGranted() {
        when(valueOps.getAndDelete(USER_ID + "+-+" + TXN_REF)).thenReturn(pendingOrder());

        // Signed by VNPay for 1.000 VND (x100) while the order is 400.000 VND.
        assertThrows(IllegalArgumentException.class, () -> service.validPayment(returnRequest("100000", TMN_CODE)));
        verify(userPlansRepository, never()).save(any());
        verify(userService, never()).saveUser(any());
    }

    @Test
    void validPayment_tmnCodeMismatch_rejectedBeforeClaim() {
        assertThrows(IllegalArgumentException.class, () -> service.validPayment(returnRequest("40000000", "OTHER")));
        verify(valueOps, never()).getAndDelete(anyString());
        verify(userPlansRepository, never()).save(any());
    }

    @Test
    void validPayment_badSignature_rejectedBeforeClaim() {
        MockHttpServletRequest req = returnRequest("40000000", TMN_CODE);
        req.setParameter("vnp_SecureHash", "forged");

        assertThrows(IllegalArgumentException.class, () -> service.validPayment(req));
        verify(valueOps, never()).getAndDelete(anyString());
    }

    @Test
    void validPayment_replay_grantsPlanOnlyOnce() {
        // GETDEL semantics: first claim returns the order, any later claim returns null.
        when(valueOps.getAndDelete(USER_ID + "+-+" + TXN_REF)).thenReturn(pendingOrder(), (PaymentRequest) null);
        User user = new User();
        user.setId(USER_ID);
        when(userService.getUserById(USER_ID)).thenReturn(user);
        when(userPlansRepository.save(any(UserPlans.class))).thenAnswer(inv -> {
            UserPlans saved = inv.getArgument(0);
            saved.setId("plan-1");
            return saved;
        });
        when(userService.saveUser(user)).thenReturn(user);
        UserDto dto = UserDto.builder().id(USER_ID).build();
        when(userMapper.toDto(user)).thenReturn(dto);

        assertSame(dto, service.validPayment(returnRequest("40000000", TMN_CODE)));
        assertThrows(IllegalArgumentException.class, () -> service.validPayment(returnRequest("40000000", TMN_CODE)));

        ArgumentCaptor<UserPlans> captor = ArgumentCaptor.forClass(UserPlans.class);
        verify(userPlansRepository, times(1)).save(captor.capture());
        assertEquals(400_000L, captor.getValue().getAmount());
        assertEquals(Plans.PRO, captor.getValue().getPlan());
        verify(redisTemplate, never()).delete(anyString());
    }

    // ---- getUserPlanInfo ownership ----

    @Test
    void getUserPlanInfo_otherUser_throws403() {
        when(userPlansRepository.findById("plan-1")).thenReturn(Optional.of(storedPlan()));
        UserDto stranger = UserDto.builder().id("stranger").role(UserRoles.USER).build();

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.getUserPlanInfo("plan-1", stranger));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
    }

    @Test
    void getUserPlanInfo_ownerAndAdmin_allowed() {
        UserPlans plan = storedPlan();
        when(userPlansRepository.findById("plan-1")).thenReturn(Optional.of(plan));
        UserPlansDto dto = UserPlansDto.builder().id("plan-1").build();
        when(userPlanMapper.toDto(plan)).thenReturn(dto);

        assertSame(dto, service.getUserPlanInfo("plan-1", UserDto.builder().id(USER_ID).role(UserRoles.USER).build()));
        assertSame(dto, service.getUserPlanInfo("plan-1", UserDto.builder().id("admin").role(UserRoles.ADMIN).build()));
    }

    private static UserPlans storedPlan() {
        return UserPlans.builder().id("plan-1").userId(USER_ID).plan(Plans.PRO).amount(400_000L).build();
    }

    private static PaymentRequest pendingOrder() {
        return PaymentRequest.builder()
                .userId(USER_ID).plan(Plans.PRO).amount(400_000L)
                .orderCode(TXN_REF).createdAt("20260924120000").build();
    }

    private static MockHttpServletRequest returnRequest(String vnpAmount, String tmnCode) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setAttribute("userId", USER_ID);
        req.setParameter("vnp_Amount", vnpAmount);
        req.setParameter("vnp_TmnCode", tmnCode);
        req.setParameter("vnp_TxnRef", TXN_REF);
        req.setParameter("vnp_ResponseCode", "00");
        req.setParameter("vnp_SecureHash", SIGNATURE);
        return req;
    }
}
