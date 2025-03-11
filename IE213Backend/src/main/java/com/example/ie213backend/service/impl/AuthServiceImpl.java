package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.dto.AuthDto.RegistrationRequest;
import com.example.ie213backend.domain.dto.UserDto.CreateUserDto;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.security.DrawUserDetails;
import com.example.ie213backend.service.AuthService;
import com.example.ie213backend.service.EmailService;
import com.example.ie213backend.service.UserService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import java.security.Key;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
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

    private String extractUsername(String token, TokenType tokenType) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        TokenType requestTokenType = TokenType.valueOf((String) claims.get("tokenType"));

        if (requestTokenType != tokenType) {
            log.info("Wrong type of token!");
            return null;
        }

        return claims.getSubject();
    }

    @Override
    public String createRegistrationRequest(String email, String password,String firstName, String lastName,String phone) {

        // kiểm tra người dùng có trong repository chưa
        User isExist = userService.getUserByEmail(email);
        if (isExist != null) {
            throw new RuntimeException("tài khoản đã tồn tại");// BÁO LỖI VÌ ĐÃ ĐĂNG KÍ TÀI KHOẢN
        }
        // KIỂM TRA CÓ Đang xác thực hay không
        RegistrationRequest existingRequest = (RegistrationRequest) redisTemplate.opsForValue().get(email);
        if (existingRequest != null) {
            throw new RuntimeException("Vui lòng xác thực tài khoản");
        }

        String code = generateCode(); // Tạo mã xác thực


        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(5); // Hết hạn sau 5 phút

        RegistrationRequest request = new RegistrationRequest(email,code,password,firstName,lastName,phone, expiredAt);

        redisTemplate.opsForValue().set(email, request, 5, TimeUnit.MINUTES);

        // Gửi mã xác thực đến email (giả lập)
        emailService.sendVerificationEmail(email,code);
        return email;
    }

    @Override
    public RegistrationRequest getRegistrationRequest(String email) {
        return redisTemplate.opsForValue().get(email);
    }

    // Xóa yêu cầu đăng ký khỏi Redis
    public void deleteRegistrationRequest(String email) {
        redisTemplate.delete(email);
    }

    @Override
    public boolean verifyCode(String email, String code) {
        RegistrationRequest request = redisTemplate.opsForValue().get(email);
        System.out.println(request);
        if (request != null && request.getCode().equals(code)) {
            deleteRegistrationRequest(email); // Xóa yêu cầu sau khi xác thực thành công
            // tạo User lưu vào database
            CreateUserDto newUser = new CreateUserDto();
            newUser.setEmail(email);
            newUser.setPhone(request.getPhone());
            newUser.setPassword(request.getPassword());
            newUser.setFirstName(request.getFirstName());
            newUser.setLastName(request.getLastName());

            userService.createUser(newUser);
            return true;
        }
        return false;
    }

    @Override
    public String forgetPassword(String email) {
        // Kiểm tra xem email có tồn tại trong hệ thống không
        User finderUser = userService.getUserByEmail(email);
        if (finderUser == null) {
            throw new RuntimeException("Email không tồn tại trong hệ thống");
        }

        // Tạo mã xác thực (OTP)
        String code = generateCode();

        // Lưu mã xác thực vào Redis với thời gian hết hạn (ví dụ: 5 phút)
        LocalDateTime expiredAt = LocalDateTime.now().plusMinutes(5);
        redisTemplate.opsForValue().set(email, new RegistrationRequest(email, code, null, null, null, null, expiredAt), 5, TimeUnit.MINUTES);

        // Gửi mã xác thực đến email
        emailService.sendVerificationEmail(email, code);

        return "Mã xác thực đã được gửi đến email của bạn";
    }

    @Override
    public String resetPassword(String email, String code, String newPassword) {
        // Lấy yêu cầu đặt lại mật khẩu từ Redis
        RegistrationRequest request = redisTemplate.opsForValue().get(email);
        if (request == null || !request.getCode().equals(code)) {
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

        // Mã hóa mật khẩu mới trước khi lưu vào database
        user.setPassword(newPassword);
        userService.changePassword(user);

        // Xóa yêu cầu đặt lại mật khẩu khỏi Redis
        redisTemplate.delete(email);

        return "Mật khẩu đã được đặt lại thành công";
    }

    public String generateCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // Tạo số từ 100000 đến 999999
        return String.valueOf(code);
    }
}
