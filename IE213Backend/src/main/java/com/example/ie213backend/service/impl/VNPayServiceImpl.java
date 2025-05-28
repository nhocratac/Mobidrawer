package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.PaymentRequest;
import com.example.ie213backend.domain.dto.PaymentDto.UserPlansDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.domain.model.UserPlans;
import com.example.ie213backend.mapper.UserMapper;
import com.example.ie213backend.mapper.UserPlanMapper;
import com.example.ie213backend.repository.UserPlansRepository;
import com.example.ie213backend.service.UserService;
import com.example.ie213backend.service.VNPayService;
import com.example.ie213backend.utils.VNPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VNPayServiceImpl implements VNPayService {
    private final VNPayUtil vnPayUtil;
    private final UserService userService;
    private final UserPlansRepository userPlansRepository;
    private final UserMapper userMapper;
    private final RedisTemplate<String, PaymentRequest> redisTemplate;
    private final UserPlanMapper userPlanMapper;

    @Override
    public String createPaymentUrl(CreatePaymentDto createPaymentDto, HttpServletRequest req) {
        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String vnp_OrderInfo = createPaymentDto.getOrderInfo();
        String orderType = createPaymentDto.getOrderType();
        String vnp_TxnRef = vnPayUtil.getRandomNumber(8);
        String vnp_IpAddr = vnPayUtil.getIpAddress(req);
        String vnp_TmnCode = vnPayUtil.vnp_TmnCode;

        int amount = createPaymentDto.getAmount() * 100;
        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", vnp_TmnCode);
        vnp_Params.put("vnp_Amount", String.valueOf(amount));
        vnp_Params.put("vnp_CurrCode", "VND");
        String bank_code = createPaymentDto.getBankCode();
        if (bank_code != null && !bank_code.isEmpty()) {
            vnp_Params.put("vnp_BankCode", bank_code);
        }
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);
        vnp_Params.put("vnp_OrderType", orderType);

        String locate = createPaymentDto.getLanguage();
        if (locate != null && !locate.isEmpty()) {
            vnp_Params.put("vnp_Locale", locate);
        } else {
            vnp_Params.put("vnp_Locale", "vn");
        }
        vnp_Params.put("vnp_ReturnUrl", vnPayUtil.vnp_ReturnUrl);
        vnp_Params.put("vnp_IpAddr", vnp_IpAddr);
        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));

        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");
        String vnp_CreateDate = formatter.format(cld.getTime());

        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);
        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        //Add Params of 2.1.0 Version
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

        //Build data to hash and querystring
        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();

        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnp_Params.get(fieldName);
            if ((fieldValue != null) && (!fieldValue.isEmpty())) {
                //Build hash data
                hashData.append(fieldName);
                hashData.append('=');
                hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                //Build query
                query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII));
                query.append('=');
                query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII));
                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }
        String queryUrl = query.toString();
        String vnp_SecureHash = vnPayUtil.hmacSHA512(vnPayUtil.vnp_HashSecret, hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;

        redisTemplate.opsForValue().set(req.getAttribute("userId") + "+-+" + vnp_TxnRef,
                PaymentRequest.builder()
                        .userId(req.getAttribute("userId").toString())
                        .plan(createPaymentDto.getPlan())
                        .amount(createPaymentDto.getAmount())
                        .orderCode(vnp_TxnRef)
                        .createdAt(vnp_CreateDate)
                        .build(),
                Duration.ofMinutes(10));
        return vnPayUtil.vnp_PayUrl + "?" + queryUrl;
    }

    @Override
    public UserDto validPayment(HttpServletRequest req) {
        String redisKey = req.getAttribute("userId") + "+-+" + req.getParameter("vnp_TxnRef");
        System.out.println(redisKey);
        PaymentRequest paymentRequest = redisTemplate.opsForValue().get(redisKey);
//        System.out.println(paymentRequest.toString());
        if (paymentRequest == null) {
            throw new IllegalArgumentException("Lỗi user ko có payment này");
        }

        Map<String, String> fields = new HashMap<>();
        for (Enumeration<String> params = req.getParameterNames(); params.hasMoreElements(); ) {
            String fieldName = URLEncoder.encode(params.nextElement(), StandardCharsets.US_ASCII);
            String fieldValue = URLEncoder.encode(req.getParameter(fieldName), StandardCharsets.US_ASCII);
            if ((fieldValue != null) && (!fieldValue.isEmpty())) {
                fields.put(fieldName, fieldValue);
            }
        }

        String vnp_SecureHash = req.getParameter("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");
        fields.remove("vnp_SecureHash");
        String signValue = vnPayUtil.hashAllFields(fields);

        if (signValue.equals(vnp_SecureHash)) {
            if ("00".equals(req.getParameter("vnp_ResponseCode"))) {
                return processPayment(paymentRequest.getUserId(),
                        paymentRequest.getPlan(),
                        paymentRequest.getAmount(),
                        paymentRequest.getOrderCode(),
                        paymentRequest.getCreatedAt());
            } else {
                throw new IllegalArgumentException("GD Khong thanh cong");
            }
        } else {
            throw new IllegalArgumentException("Chu ky khong hop le");
        }
    }

    @Override
    public UserPlansDto getUserPlanInfo(String userPlanId) {
        UserPlans userPlans = userPlansRepository.findById(userPlanId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy plan với id: " + userPlanId));

        return userPlanMapper.toDto(userPlans);
    }

    private UserDto processPayment(String userId, Plans plan, Long amount, String orderCode, String payDate) {
        User user = userService.getUserById(userId);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        LocalDateTime createdDate = LocalDateTime.parse(payDate, formatter);
        LocalDateTime expireDate = createdDate.plusMonths(1);

        Optional<UserPlans> optionalUserPlans = userPlansRepository.findById(user.getUserPlansId());
        if (optionalUserPlans.isPresent()) {
            UserPlans userPlans = optionalUserPlans.get();
            if (userPlans.getExpiresAt().isAfter(createdDate)) {
                expireDate = userPlans.getExpiresAt().plusMonths(1);
            }
            userPlans.setActive(false);
            userPlansRepository.save(userPlans);
        }

        UserPlans userPlans = UserPlans.builder()
                .userId(userId)
                .plan(plan)
                .amount(amount)
                .createdAt(createdDate)
                .expiresAt(expireDate)
                .orderCode(orderCode)
                .active(true)
                .build();

        UserPlans saveUserPlan = userPlansRepository.save(userPlans);
        user.setPlan(saveUserPlan.getPlan());
        user.setUserPlansId(saveUserPlan.getId());
        User updateUser = userService.saveUser(user);

        redisTemplate.delete(userId + "-" + orderCode);
        return userMapper.toDto(updateUser);
    }
}
