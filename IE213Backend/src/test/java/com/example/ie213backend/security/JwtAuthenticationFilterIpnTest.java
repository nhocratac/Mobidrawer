package com.example.ie213backend.security;

import com.example.ie213backend.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

/** The IPN URL is called by VNPay without a JWT: the filter must let it through; other payment routes still need a token. */
class JwtAuthenticationFilterIpnTest {
    static { System.setProperty("net.bytebuddy.experimental", "true"); }
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(Mockito.mock(AuthService.class), new ObjectMapper());

    private MockHttpServletRequest req(String method, String path) {
        MockHttpServletRequest r = new MockHttpServletRequest(method, path);
        r.setServletPath(path);
        return r;
    }

    @Test
    void ipn_get_and_post_withoutToken_passThrough() throws Exception {
        for (String m : new String[]{"GET", "POST"}) {
            MockFilterChain chain = new MockFilterChain();
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req(m, "/api/v1/payments/vnpay-ipn"), res, chain);
            assertNotNull(chain.getRequest(), m + " must continue down the chain");
            assertEquals(200, res.getStatus());
        }
    }

    @Test
    void otherPaymentRoutes_withoutToken_rejected() throws Exception {
        for (String p : new String[]{"/api/v1/payments/orders/T1", "/api/v1/payments/create-payment-url", "/api/v1/payments/vnpay-ipn/extra"}) {
            MockFilterChain chain = new MockFilterChain();
            MockHttpServletResponse res = new MockHttpServletResponse();
            filter.doFilter(req("GET", p), res, chain);
            assertNull(chain.getRequest(), p + " must not continue without a token");
            assertEquals(401, res.getStatus(), p);
        }
    }
}
