package com.example.ie213backend.service;


import com.example.ie213backend.dto.AuthDto.RegistrationRequest;
import com.example.ie213backend.dto.UserDto.createUserDto;
import com.example.ie213backend.model.User;
import com.example.ie213backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;
import java.util.concurrent.TimeUnit;

@Service
public class AuthService {

    @Autowired
    private UserService userService;

    @Autowired
    private EmailService emailService;

    @Autowired
    private RedisTemplate<String, RegistrationRequest> redisTemplate;


    public String createRegistrationRequest(String email, String password,String firstName, String lastName,String phone) {

        // kiểm tra người dùng có trong repository chưa
        User isExist = (userService.getUserByEmail(email));
        if (isExist != null) {
            throw new RuntimeException("tài khoản đã tồn tại");// BÁO LỖI VÌ ĐÃ ĐĂNG KÍ TÀI KHOẢN
        }
        // KIỂM TRA CÓ Đang xác thực hay không
        RegistrationRequest existingRequest = redisTemplate.opsForValue().get(email);
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

    public RegistrationRequest getRegistrationRequest(String email) {
        return redisTemplate.opsForValue().get(email);
    }

    // Xóa yêu cầu đăng ký khỏi Redis
    public void deleteRegistrationRequest(String email) {
        redisTemplate.delete(email);
    }

    public boolean verifyCode(String email, String code) {
        RegistrationRequest request = redisTemplate.opsForValue().get(email);
        System.out.println(request);
        if (request != null && request.getCode().equals(code)) {
            deleteRegistrationRequest(email); // Xóa yêu cầu sau khi xác thực thành công
            // tạo User lưu vào database
            createUserDto newUser = new createUserDto();
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

    public User login(String email, String password) {
        User findUser = userService.login(email,password);
        if (findUser != null ) {
            findUser.setPassword(null);
            return findUser;
        }
        return null;
    }

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

    String generateCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // Tạo số từ 100000 đến 999999
        return String.valueOf(code);
    }
}
