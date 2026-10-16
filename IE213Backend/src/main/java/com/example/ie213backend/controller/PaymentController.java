package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.ApiTemplateResponse;
import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.OrderStatusDto;
import com.example.ie213backend.domain.dto.PaymentDto.UserPlansDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.VNPayService;
import com.example.ie213backend.service.payment.IpnResponse;
import com.example.ie213backend.service.payment.PaymentIpnHandler;
import com.example.ie213backend.utils.VNPayUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RequiredArgsConstructor
@RestController
@RequestMapping("${api.prefix}/payments")
public class PaymentController {
    private final VNPayService vnPayService;
    private final PaymentIpnHandler ipnHandler;
    private final VNPayUtil vnPayUtil;

    @PostMapping("/create-payment-url")
    public ResponseEntity<ApiTemplateResponse<String>> createPaymentUrl(@Valid @RequestBody CreatePaymentDto dto, HttpServletRequest req) {
        String url = vnPayService.createPaymentUrl(dto, String.valueOf(req.getAttribute("userId")), vnPayUtil.getIpAddress(req));
        return ResponseEntity.ok(ApiTemplateResponse.<String>builder()
                .status(HttpStatus.OK.toString()).message("Payment url generated successfully!").data(url).build());
    }

    /** VNPay server-to-server callback. No JWT (see SecurityConfig / JwtAuthenticationFilter). Always HTTP 200 + {RspCode, Message}. */
    @RequestMapping(value = "/vnpay-ipn", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Map<String, String>> vnpayIpn(HttpServletRequest req) {
        Map<String, String> params = new LinkedHashMap<>();
        req.getParameterMap().forEach((k, v) -> { if (v != null && v.length > 0) params.put(k, v[0]); });
        IpnResponse r = ipnHandler.handle(params);
        return ResponseEntity.ok(Map.of("RspCode", r.rspCode(), "Message", r.message()));
    }

    @GetMapping("/orders/{txnRef}")
    public ResponseEntity<ApiTemplateResponse<OrderStatusDto>> getOrderStatus(@PathVariable String txnRef,
                                                                             @RequestAttribute("user") UserDto actor) {
        OrderStatusDto dto = vnPayService.getOrderStatus(txnRef, actor);
        return ResponseEntity.ok(ApiTemplateResponse.<OrderStatusDto>builder()
                .status(HttpStatus.OK.toString()).message("ok").data(dto).build());
    }

    @GetMapping("/{userPlanId}")
    public ResponseEntity<UserPlansDto> getUserPlans(@PathVariable String userPlanId, @RequestAttribute("user") UserDto userDto) {
        return ResponseEntity.ok(vnPayService.getUserPlanInfo(userPlanId, userDto));
    }
}
