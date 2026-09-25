package com.example.ie213backend.service.impl;

import com.example.ie213backend.configstore.ConfigKeys;
import com.example.ie213backend.configstore.ConfigService;
import com.example.ie213backend.domain.UserRoles;
import com.example.ie213backend.domain.dto.AuthDto.RegistrationRequest;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

/**
 * Pure-JVM unit tests for the OTP flows in AuthServiceImpl. Both Redis templates are
 * Mockito mocks backed by in-memory maps; no Spring context, no Redis.
 */
class AuthServiceOtpTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) does not yet officially recognize
        // Java 25 class file versions; this opts into its forward-compatible mode.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private static final String EMAIL = "alice@example.com";

    private final Map<String, RegistrationRequest> otpStore = new HashMap<>();
    private final Map<String, String> counterStore = new HashMap<>();

    private UserService userService;
    private UserRepository userRepository;
    private EmailService emailService;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private AuthServiceImpl service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        RedisTemplate<String, RegistrationRequest> redisTemplate = Mockito.mock(RedisTemplate.class);
        ValueOperations<String, RegistrationRequest> otpOps = Mockito.mock(ValueOperations.class);
        Mockito.when(redisTemplate.opsForValue()).thenReturn(otpOps);
        Mockito.when(otpOps.get(anyString())).thenAnswer(inv -> otpStore.get((String) inv.getArgument(0)));
        Mockito.doAnswer(inv -> {
            otpStore.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(otpOps).set(anyString(), any(RegistrationRequest.class), anyLong(), any(TimeUnit.class));
        Mockito.when(redisTemplate.delete(anyString()))
                .thenAnswer(inv -> otpStore.remove((String) inv.getArgument(0)) != null);

        StringRedisTemplate stringRedisTemplate = Mockito.mock(StringRedisTemplate.class);
        ValueOperations<String, String> counterOps = Mockito.mock(ValueOperations.class);
        Mockito.when(stringRedisTemplate.opsForValue()).thenReturn(counterOps);
        Mockito.when(counterOps.increment(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            long next = Long.parseLong(counterStore.getOrDefault(key, "0")) + 1;
            counterStore.put(key, String.valueOf(next));
            return next;
        });
        Mockito.when(counterOps.setIfAbsent(anyString(), anyString(), anyLong(), any(TimeUnit.class)))
                .thenAnswer(inv -> counterStore.putIfAbsent(inv.getArgument(0), inv.getArgument(1)) == null);
        Mockito.when(stringRedisTemplate.delete(anyString()))
                .thenAnswer(inv -> counterStore.remove((String) inv.getArgument(0)) != null);

        ConfigService configService = Mockito.mock(ConfigService.class);
        Mockito.when(configService.getInt(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES)).thenReturn(5);

        userService = Mockito.mock(UserService.class);
        userRepository = Mockito.mock(UserRepository.class);
        emailService = Mockito.mock(EmailService.class);

        service = new AuthServiceImpl(
                Mockito.mock(AuthenticationManager.class),
                Mockito.mock(UserDetailsService.class),
                userService,
                redisTemplate,
                emailService,
                configService,
                stringRedisTemplate,
                userRepository,
                passwordEncoder);
    }

    private String sentCode() {
        ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
        Mockito.verify(emailService, Mockito.atLeastOnce()).sendVerificationEmail(eq(EMAIL), code.capture());
        return code.getValue();
    }

    private static String wrongCode(String code) {
        return code.equals("000000") ? "111111" : "000000";
    }

    private void clearCooldown(String purpose) {
        counterStore.remove(AuthServiceImpl.cooldownKey(purpose, EMAIL));
    }

    @Test
    void generateCode_isSixDigits() {
        for (int i = 0; i < 200; i++) {
            String code = service.generateCode();
            assertEquals(6, code.length());
            int value = Integer.parseInt(code);
            assertTrue(value >= 100000 && value <= 999999);
        }
    }

    @Test
    void register_storesBcryptHashUnderRegisterNamespace_andVerifyDoesNotDoubleHash() {
        service.createRegistrationRequest(EMAIL, "Secret123!", "Alice", "A", "0900000001");

        assertNull(otpStore.get(EMAIL), "raw email key must no longer be used");
        RegistrationRequest pending = otpStore.get(AuthServiceImpl.registerKey(EMAIL));
        assertNotNull(pending);
        assertNotEquals("Secret123!", pending.getPassword());
        assertTrue(passwordEncoder.matches("Secret123!", pending.getPassword()));

        assertTrue(service.verifyCode(EMAIL, sentCode()));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        Mockito.verify(userRepository).save(saved.capture());
        assertEquals(pending.getPassword(), saved.getValue().getPassword());
        assertTrue(passwordEncoder.matches("Secret123!", saved.getValue().getPassword()));
        assertEquals(UserRoles.USER, saved.getValue().getRole());
        assertEquals(EMAIL, saved.getValue().getEmail());
        Mockito.verify(userService, Mockito.never()).createUser(any());
        assertNull(otpStore.get(AuthServiceImpl.registerKey(EMAIL)));
    }

    @Test
    void verifyCode_isSingleUse() {
        service.createRegistrationRequest(EMAIL, "Secret123!", "Alice", "A", "0900000001");
        String code = sentCode();

        assertTrue(service.verifyCode(EMAIL, code));
        assertFalse(service.verifyCode(EMAIL, code));
        Mockito.verify(userRepository, Mockito.times(1)).save(any(User.class));
    }

    @Test
    void verifyCode_invalidatesOtpAfterMaxFailedAttempts() {
        service.createRegistrationRequest(EMAIL, "Secret123!", "Alice", "A", "0900000001");
        String code = sentCode();

        for (int i = 0; i < AuthServiceImpl.MAX_FAILED_ATTEMPTS; i++) {
            assertFalse(service.verifyCode(EMAIL, wrongCode(code)));
        }

        assertNull(otpStore.get(AuthServiceImpl.registerKey(EMAIL)));
        assertFalse(service.verifyCode(EMAIL, code), "correct code must be rejected once invalidated");
        Mockito.verify(userRepository, Mockito.never()).save(any(User.class));
    }

    @Test
    void verifyCode_correctCodeBeforeLimitStillWorks() {
        service.createRegistrationRequest(EMAIL, "Secret123!", "Alice", "A", "0900000001");
        String code = sentCode();

        for (int i = 0; i < AuthServiceImpl.MAX_FAILED_ATTEMPTS - 1; i++) {
            assertFalse(service.verifyCode(EMAIL, wrongCode(code)));
        }
        assertTrue(service.verifyCode(EMAIL, code));
    }

    @Test
    void register_secondRequestWithinCooldown_returns429() {
        service.createRegistrationRequest(EMAIL, "Secret123!", "Alice", "A", "0900000001");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.createRegistrationRequest(EMAIL, "Secret123!", "Alice", "A", "0900000001"));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        Mockito.verify(emailService, Mockito.times(1)).sendVerificationEmail(eq(EMAIL), anyString());
    }

    @Test
    void forgetPassword_hourlyLimitReturns429() {
        Mockito.when(userService.getUserByEmail(EMAIL)).thenReturn(new User());

        for (int i = 0; i < AuthServiceImpl.OTP_MAX_REQUESTS_PER_HOUR; i++) {
            clearCooldown(AuthServiceImpl.OTP_PURPOSE_RESET);
            service.forgetPassword(EMAIL);
        }
        clearCooldown(AuthServiceImpl.OTP_PURPOSE_RESET);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.forgetPassword(EMAIL));
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        Mockito.verify(emailService, Mockito.times(AuthServiceImpl.OTP_MAX_REQUESTS_PER_HOUR))
                .sendVerificationEmail(eq(EMAIL), anyString());
    }

    @Test
    void resetOtp_cannotBeUsedToVerifyRegistration_andViceVersa() {
        Mockito.when(userService.getUserByEmail(EMAIL)).thenReturn(new User());
        service.forgetPassword(EMAIL);
        String resetCode = sentCode();

        assertNotNull(otpStore.get(AuthServiceImpl.resetKey(EMAIL)));
        assertFalse(service.verifyCode(EMAIL, resetCode));
        Mockito.verify(userRepository, Mockito.never()).save(any(User.class));
        assertNotNull(otpStore.get(AuthServiceImpl.resetKey(EMAIL)), "reset OTP untouched by register verify");
    }

    @Test
    void resetPassword_success_changesPasswordAndConsumesOtp() {
        User user = new User();
        user.setEmail(EMAIL);
        Mockito.when(userService.getUserByEmail(EMAIL)).thenReturn(user);
        service.forgetPassword(EMAIL);
        String code = sentCode();

        service.resetPassword(EMAIL, code, "NewPass1!");

        Mockito.verify(userService).changePassword(user);
        assertEquals("NewPass1!", user.getPassword());
        assertNull(otpStore.get(AuthServiceImpl.resetKey(EMAIL)));
        assertThrows(RuntimeException.class, () -> service.resetPassword(EMAIL, code, "Other1!"));
    }

    @Test
    void resetPassword_invalidatesOtpAfterMaxFailedAttempts() {
        Mockito.when(userService.getUserByEmail(EMAIL)).thenReturn(new User());
        service.forgetPassword(EMAIL);
        String code = sentCode();

        for (int i = 0; i < AuthServiceImpl.MAX_FAILED_ATTEMPTS; i++) {
            assertThrows(RuntimeException.class, () -> service.resetPassword(EMAIL, wrongCode(code), "NewPass1!"));
        }

        assertNull(otpStore.get(AuthServiceImpl.resetKey(EMAIL)));
        assertThrows(RuntimeException.class, () -> service.resetPassword(EMAIL, code, "NewPass1!"));
        Mockito.verify(userService, Mockito.never()).changePassword(any());
    }

    @Test
    void newOtpRequest_resetsFailedAttemptCounter() {
        Mockito.when(userService.getUserByEmail(EMAIL)).thenReturn(new User());
        service.forgetPassword(EMAIL);
        String first = sentCode();
        for (int i = 0; i < AuthServiceImpl.MAX_FAILED_ATTEMPTS - 1; i++) {
            assertThrows(RuntimeException.class, () -> service.resetPassword(EMAIL, wrongCode(first), "x"));
        }

        clearCooldown(AuthServiceImpl.OTP_PURPOSE_RESET);
        service.forgetPassword(EMAIL);

        assertNull(counterStore.get(AuthServiceImpl.attemptsKey(AuthServiceImpl.OTP_PURPOSE_RESET, EMAIL)));
        RegistrationRequest pending = otpStore.get(AuthServiceImpl.resetKey(EMAIL));
        assertTrue(pending.getExpiredAt().isAfter(LocalDateTime.now()));
    }

    @Test
    void resetPassword_attemptsOverLimit_rejected429WithoutComparing() {
        // Simulates MAX_FAILED_ATTEMPTS concurrent guesses that already INCR'd the counter:
        // the next request, even with the correct code, must be rejected before comparing.
        Mockito.when(userService.getUserByEmail(EMAIL)).thenReturn(new User());
        service.forgetPassword(EMAIL);
        String code = sentCode();
        counterStore.put(AuthServiceImpl.attemptsKey(AuthServiceImpl.OTP_PURPOSE_RESET, EMAIL),
                String.valueOf(AuthServiceImpl.MAX_FAILED_ATTEMPTS));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.resetPassword(EMAIL, code, "NewPass1!"));

        assertEquals(HttpStatus.TOO_MANY_REQUESTS, ex.getStatusCode());
        assertNull(otpStore.get(AuthServiceImpl.resetKey(EMAIL)), "OTP must be invalidated");
        Mockito.verify(userService, Mockito.never()).changePassword(any());
    }

    @Test
    void verifyCode_attemptsOverLimit_rejectedWithoutComparing() {
        service.createRegistrationRequest(EMAIL, "Secret123!", "Alice", "A", "0900000001");
        String code = sentCode();
        counterStore.put(AuthServiceImpl.attemptsKey(AuthServiceImpl.OTP_PURPOSE_REGISTER, EMAIL),
                String.valueOf(AuthServiceImpl.MAX_FAILED_ATTEMPTS));

        assertFalse(service.verifyCode(EMAIL, code));
        assertNull(otpStore.get(AuthServiceImpl.registerKey(EMAIL)), "OTP must be invalidated");
        Mockito.verify(userRepository, Mockito.never()).save(any());
    }
}
