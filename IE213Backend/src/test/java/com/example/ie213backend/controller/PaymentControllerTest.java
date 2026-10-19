package com.example.ie213backend.controller;

import com.example.ie213backend.domain.OrderStatus;
import com.example.ie213backend.domain.dto.PaymentDto.CreatePaymentDto;
import com.example.ie213backend.domain.dto.PaymentDto.OrderStatusDto;
import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.service.VNPayService;
import com.example.ie213backend.service.payment.IpnResponse;
import com.example.ie213backend.service.payment.PaymentIpnHandler;
import com.example.ie213backend.utils.VNPayUtil;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.lang.reflect.Method;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PaymentControllerTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }
    VNPayService service = mock(VNPayService.class);
    PaymentIpnHandler ipn = mock(PaymentIpnHandler.class);
    VNPayUtil util = mock(VNPayUtil.class);
    PaymentController controller = new PaymentController(service, ipn, util);

    @Test
    void ipn_flattensParams_andReturnsVnpayJsonShape() {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/payments/vnpay-ipn");
        req.setParameter("vnp_TxnRef", "T1");
        req.setParameter("vnp_SecureHash", "abc");
        when(ipn.handle(Map.of("vnp_TxnRef", "T1", "vnp_SecureHash", "abc"))).thenReturn(IpnResponse.OK);
        ResponseEntity<Map<String, String>> res = controller.vnpayIpn(req);
        assertEquals(200, res.getStatusCode().value());
        assertEquals(Map.of("RspCode", "00", "Message", "Confirm Success"), res.getBody());
    }

    @Test
    void ipn_alwaysHttp200_evenOnRejection() {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/payments/vnpay-ipn");
        when(ipn.handle(anyMap())).thenReturn(IpnResponse.INVALID_SIGNATURE);
        ResponseEntity<Map<String, String>> res = controller.vnpayIpn(req);
        assertEquals(200, res.getStatusCode().value());
        assertEquals("97", res.getBody().get("RspCode"));
    }

    @Test
    void createPaymentUrl_passesJwtUserIdAndClientIp() {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/payments/create-payment-url");
        req.setAttribute("userId", "u1");
        when(util.getIpAddress(req)).thenReturn("9.9.9.9");
        when(service.createPaymentUrl(any(), eq("u1"), eq("9.9.9.9"))).thenReturn("https://pay");
        CreatePaymentDto dto = CreatePaymentDto.builder().plan(Plans.PRO).orderInfo("x").build();
        assertEquals("https://pay", controller.createPaymentUrl(dto, req).getBody().getData());
    }

    @Test
    void orderStatus_delegatesWithActor() {
        UserDto me = new UserDto(); me.setId("u1");
        when(service.getOrderStatus("T1", me)).thenReturn(OrderStatusDto.builder().txnRef("T1").status(OrderStatus.PENDING).build());
        assertEquals(OrderStatus.PENDING, controller.getOrderStatus("T1", me).getBody().getData().getStatus());
    }

    @Test
    void validPayment_routeIsGone() {
        for (Method m : PaymentController.class.getDeclaredMethods()) assertNotEquals("validPayment", m.getName());
    }
}
