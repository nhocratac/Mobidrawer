package com.example.ie213backend.utils;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class VNPayUtil {

    @Value("${vnp.pay.url}")
    public String vnp_PayUrl;

    @Value("${vnp.return.url}")
    public String vnp_ReturnUrl;

    @Value("${vnp.tmn.code}")
    public String vnp_TmnCode;

    @Value("${vnp.secret.key}")
    public String vnp_HashSecret;

    @Value("${vnp.api.url}")
    public String vnp_ApiUrl;

    public String getIpAddress(HttpServletRequest request) {
        String ipAdress;
        try {
            ipAdress = request.getHeader("X-FORWARDED-FOR");
            if (ipAdress == null) {
                ipAdress = request.getRemoteAddr();
            }
        } catch (Exception e) {
            ipAdress = "Invalid IP:" + e.getMessage();
        }
        return ipAdress;
    }
}
