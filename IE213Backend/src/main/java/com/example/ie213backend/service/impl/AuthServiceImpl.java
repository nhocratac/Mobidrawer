package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.dto.AuthDto.RegistrationRequest;
import com.example.ie213backend.domain.UserRoles;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.configstore.ConfigKeys;
import com.example.ie213backend.configstore.ConfigService;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.repository.UserRepository;
import com.example.ie213backend.security.DrawUserDetails;
import com.example.ie213backend.service.AuthService;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.UserService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final UserService userService;
    private final RedisTemplate<String, RegistrationRequest> redisTemplate;
    private final EmailService emailService;
    private final ConfigService configService;
    private final StringRedisTemplate stringRedisTemplate;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    static final String OTP_PURPOSE_REGISTER = "register";
    static final String OTP_PURPOSE_RESET = "reset";
    static final int MAX_FAILED_ATTEMPTS = 5;
    static final long OTP_REQUEST_COOLDOWN_SECONDS = 60;
    static final int OTP_MAX_REQUESTS_PER_HOUR = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${jwt.secret}")
    private String secretKey;

    @Value("${jwt.access.expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh.expiration}")
    private long refreshTokenExpiration;

    @Override
    public UserDetails authenticate(String email, String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        return userDetailsService.loadUserByUsername(email);
    }

    @Override
    public String generateToken(UserDetails userDetails, TokenType tokenType) {
        Map<String, Object> claims = new HashMap<>();
        long expiration = switch (tokenType) {
            case ACCESS -> accessTokenExpiration;
            case REFRESH -> refreshTokenExpiration;
        };

        claims.put("user", UserMapper.INSTANCE.toDto(((DrawUserDetails) userDetails).getUser()));

        claims.put("tokenType", tokenType);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(userDetails.getUsername())
                .setIssuedAt(new Date((System.currentTimeMillis())))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    @Override
    public UserDetails validateToken(String token, TokenType tokenType) {
        String username = extractUsername(token, tokenType);
        return userDetailsService.loadUserByUsername(username);
    }

    private Key getSigningKey() {
        byte[] keyBytes = secretKey.getBytes();
        return Keys.hmacShaKeyFor(keyBytes);
    }

    @Override
    public Date extractExpiration(String token, TokenType tokenType) {
        return extractClaims(token, tokenType).getExpiration();
    }

    private String extractUsername(String token, TokenType tokenType) {
        return extractClaims(token, tokenType).getSubject();
    }

    private Claims extractClaims(String token, TokenType tokenType) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        TokenType requestTokenType = TokenType.valueOf((String) claims.get("tokenType"));

        if (requestTokenType != tokenType) {
            log.info("Wrong type of token!");
            throw new JwtException("Wrong type of token!");
        }

        return claims;
    }

    @Override
    public String createRegistrationRequest(String email, String password,String firstName, String lastName,String phone) {

        // Giới hạn tần suất gửi OTP theo email (429 nếu vượt)
        enforceOtpRequestRateLimit(OTP_PURPOSE_REGISTER, email);

        // kiểm tra người dùng có trong repository chưa
        User isExist = userService.getUserByEmail(email);
        if (isExist != null) {
            throw new RuntimeException("tài khoản đã tồn tại");// BÁO LỖI VÌ ĐÃ ĐĂNG KÍ TÀI KHOẢN
        }
        // KIỂM TRA CÓ Đang xác thực hay không
        RegistrationRequest existingRequest = redisTemplate.opsForValue().get(registerKey(email));
        if (existingRequest != null) {
            throw new RuntimeException("Vui lòng xác thực tài khoản");
        }

        String code = generateCode(); // Tạo mã xác thực

        int expiryMinutes = configService.getInt(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES);
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(expiryMinutes); // Hết hạn theo cấu hình

        // Lưu mật khẩu đã hash (BCrypt) - không lưu plaintext trong Redis
        RegistrationRequest request = new RegistrationRequest(email,code,passwordEncoder.encode(password),firstName,lastName,phone, expiredAt);

        stringRedisTemplate.delete(attemptsKey(OTP_PURPOSE_REGISTER, email));
        redisTemplate.opsForValue().set(registerKey(email), request, expiryMinutes, TimeUnit.MINUTES);

        // Gửi mã xác thực đến email
        emailService.sendVerificationEmail(email,code);
        return email;
    }

    @Override
    public RegistrationRequest getRegistrationRequest(String email) {
        return redisTemplate.opsForValue().get(registerKey(email));
    }

    // Xóa yêu cầu đăng ký khỏi Redis
    public void deleteRegistrationRequest(String email) {
        redisTemplate.delete(registerKey(email));
        stringRedisTemplate.delete(attemptsKey(OTP_PURPOSE_REGISTER, email));
    }

    @Override
    public boolean verifyCode(String email, String code) {
        String key = registerKey(email);
        // Đếm lượt thử TRƯỚC khi so mã (INCR là atomic) để request song song không vượt giới hạn
        long attempt = countAttempt(OTP_PURPOSE_REGISTER, email, key);
        if (attempt > MAX_FAILED_ATTEMPTS) {
            return false;
        }
        RegistrationRequest request = redisTemplate.opsForValue().get(key);
        if (request == null) {
            return false;
        }
        if (!codeMatches(request.getCode(), code)) {
            invalidateIfLimitReached(attempt, OTP_PURPOSE_REGISTER, key);
            return false;
        }
        // Chỉ request nào xóa được key mới tạo user (tránh tạo trùng khi verify song song)
        if (!Boolean.TRUE.equals(redisTemplate.delete(key))) {
            return false;
        }
        stringRedisTemplate.delete(attemptsKey(OTP_PURPOSE_REGISTER, email));

        // tạo User lưu vào database. Password trong Redis đã là BCrypt hash nên lưu thẳng,
        // không đi qua userService.createUser (hàm đó sẽ hash thêm lần nữa).
        User newUser = new User();
        newUser.setEmail(email);
        newUser.setRole(UserRoles.USER);
        newUser.setPassword(request.getPassword());
        newUser.setFirstName(request.getFirstName());
        newUser.setLastName(request.getLastName());
        newUser.setPhone(request.getPhone());
        userRepository.save(newUser);
        return true;
    }

    @Override
    public String forgetPassword(String email) {
        // Giới hạn tần suất gửi OTP theo email (429 nếu vượt)
        enforceOtpRequestRateLimit(OTP_PURPOSE_RESET, email);

        // Kiểm tra xem email có tồn tại trong hệ thống không
        User finderUser = userService.getUserByEmail(email);
        if (finderUser == null) {
            throw new RuntimeException("Email không tồn tại trong hệ thống");
        }

        // Tạo mã xác thực (OTP)
        String code = generateCode();

        // Lưu mã xác thực vào Redis với thời gian hết hạn theo cấu hình
        int expiryMinutes = configService.getInt(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES);
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(expiryMinutes);
        stringRedisTemplate.delete(attemptsKey(OTP_PURPOSE_RESET, email));
        redisTemplate.opsForValue().set(resetKey(email), new RegistrationRequest(email, code, null, null, null, null, expiredAt), expiryMinutes, TimeUnit.MINUTES);

        // Gửi mã xác thực đến email
        emailService.sendVerificationEmail(email, code);

        return "Mã xác thực đã được gửi đến email của bạn";
    }

    @Override
    public String resetPassword(String email, String code, String newPassword) {
        // Lấy yêu cầu đặt lại mật khẩu từ Redis
        String key = resetKey(email);
        // Đếm lượt thử TRƯỚC khi so mã (INCR là atomic) để request song song không vượt giới hạn
        long attempt = countAttempt(OTP_PURPOSE_RESET, email, key);
        if (attempt > MAX_FAILED_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Bạn đã nhập sai quá nhiều lần, vui lòng yêu cầu mã mới");
        }
        RegistrationRequest request = redisTemplate.opsForValue().get(key);
        if (request == null) {
            throw new RuntimeException("Mã xác thực không hợp lệ hoặc đã hết hạn");
        }
        if (!codeMatches(request.getCode(), code)) {
            invalidateIfLimitReached(attempt, OTP_PURPOSE_RESET, key);
            throw new RuntimeException("Mã xác thực không hợp lệ hoặc đã hết hạn");
        }

        // Kiểm tra thời gian hết hạn của mã xác thực
        if (request.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Mã xác thực đã hết hạn");
        }

        // Cập nhật mật khẩu mới cho người dùng
        User user = userService.getUserByEmail(email);
        if (user == null) {
            throw new RuntimeException("Người dùng không tồn tại");
        }

        // Chỉ request nào xóa được key mới được đổi mật khẩu (OTP dùng một lần)
        if (!Boolean.TRUE.equals(redisTemplate.delete(key))) {
            throw new RuntimeException("Mã xác thực không hợp lệ hoặc đã hết hạn");
        }
        stringRedisTemplate.delete(attemptsKey(OTP_PURPOSE_RESET, email));

        // changePassword sẽ mã hóa mật khẩu mới trước khi lưu vào database
        user.setPassword(newPassword);
        userService.changePassword(user);

        return "Mật khẩu đã được đặt lại thành công";
    }

    public String generateCode() {
        int code = 100000 + SECURE_RANDOM.nextInt(900000); // Tạo số từ 100000 đến 999999
        return String.valueOf(code);
    }

    static String registerKey(String email) {
        return "otp:register:" + email;
    }

    static String resetKey(String email) {
        return "otp:reset:" + email;
    }

    static String attemptsKey(String purpose, String email) {
        return "otp:attempts:" + purpose + ":" + email;
    }

    static String cooldownKey(String purpose, String email) {
        return "otp:ratelimit:cooldown:" + purpose + ":" + email;
    }

    static String hourlyKey(String purpose, String email) {
        return "otp:ratelimit:hourly:" + purpose + ":" + email;
    }

    private static boolean codeMatches(String expected, String provided) {
        if (expected == null || provided == null) {
            return false;
        }
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), provided.getBytes(StandardCharsets.UTF_8));
    }

    // Tăng bộ đếm lượt thử (atomic) và trả về số thứ tự của lượt này. Lượt vượt
    // MAX_FAILED_ATTEMPTS bị từ chối mà không so mã; bộ đếm chỉ reset khi yêu cầu OTP mới
    // hoặc xác thực thành công. Fail-closed nếu Redis không trả về giá trị.
    private long countAttempt(String purpose, String email, String otpKey) {
        String key = attemptsKey(purpose, email);
        Long attempt = stringRedisTemplate.opsForValue().increment(key);
        if (attempt == null) {
            return Long.MAX_VALUE;
        }
        if (attempt == 1L) {
            stringRedisTemplate.expire(key, configService.getInt(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES), TimeUnit.MINUTES);
        }
        if (attempt > MAX_FAILED_ATTEMPTS) {
            redisTemplate.delete(otpKey);
        }
        return attempt;
    }

    // Lượt sai thứ MAX_FAILED_ATTEMPTS thì hủy OTP, buộc phải yêu cầu mã mới
    private void invalidateIfLimitReached(long attempt, String purpose, String otpKey) {
        if (attempt >= MAX_FAILED_ATTEMPTS) {
            log.warn("OTP invalidated after {} failed attempts (purpose={})", attempt, purpose);
            redisTemplate.delete(otpKey);
        }
    }

    // 1 yêu cầu / OTP_REQUEST_COOLDOWN_SECONDS và tối đa OTP_MAX_REQUESTS_PER_HOUR yêu cầu / giờ cho mỗi email
    private void enforceOtpRequestRateLimit(String purpose, String email) {
        Boolean firstInWindow = stringRedisTemplate.opsForValue()
                .setIfAbsent(cooldownKey(purpose, email), "1", OTP_REQUEST_COOLDOWN_SECONDS, TimeUnit.SECONDS);
        if (!Boolean.TRUE.equals(firstInWindow)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Vui lòng đợi trước khi yêu cầu mã mới");
        }

        String hourly = hourlyKey(purpose, email);
        Long count = stringRedisTemplate.opsForValue().increment(hourly);
        if (count != null && count == 1L) {
            stringRedisTemplate.expire(hourly, 1, TimeUnit.HOURS);
        }
        if (count != null && count > OTP_MAX_REQUESTS_PER_HOUR) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Bạn đã yêu cầu quá nhiều mã, vui lòng thử lại sau");
        }
    }
}
