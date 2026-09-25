package com.example.ie213backend.security;

import com.example.ie213backend.domain.TokenType;
import com.example.ie213backend.domain.UserRoles;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

/**
 * Public GET paths (blog by id, templates) stay anonymous-accessible, but a
 * valid bearer token now identifies the caller so owner/ADMIN-only content can
 * be served; a bad token on those paths degrades to anonymous, never 401.
 */
class JwtAuthenticationFilterOptionalAuthTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) needs forward-compatible mode on Java 25.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    private final AuthService authService = Mockito.mock(AuthService.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(authService, new ObjectMapper());

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequest get(String path) {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", path);
        req.setServletPath(path);
        return req;
    }

    @Test
    void publicGet_validToken_setsUserAttribute() throws Exception {
        User user = new User();
        user.setId("owner-1");
        user.setRole(UserRoles.USER);
        Mockito.when(authService.validateToken("good", TokenType.ACCESS)).thenReturn(new DrawUserDetails(user));
        MockHttpServletRequest req = get("/api/v1/blogs/blog-1");
        req.addHeader("Authorization", "Bearer good");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, new MockHttpServletResponse(), chain);

        assertNotNull(chain.getRequest(), "request must continue down the chain");
        assertEquals("owner-1", ((UserDto) req.getAttribute("user")).getId());
        assertEquals("owner-1", req.getAttribute("userId"));
    }

    @Test
    void publicGet_badToken_continuesAnonymously() throws Exception {
        Mockito.when(authService.validateToken(anyString(), any()))
                .thenThrow(new ExpiredJwtException(null, null, "expired"));
        MockHttpServletRequest req = get("/api/v1/template/tpl-1");
        req.addHeader("Authorization", "Bearer expired");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, res, chain);

        assertEquals(200, res.getStatus());
        assertNotNull(chain.getRequest());
        assertNull(req.getAttribute("user"));
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    @Test
    void publicGet_noToken_continuesAnonymously() throws Exception {
        MockHttpServletRequest req = get("/api/v1/blogs/blog-1");
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, new MockHttpServletResponse(), chain);

        assertNotNull(chain.getRequest());
        assertNull(req.getAttribute("user"));
        Mockito.verifyNoInteractions(authService);
    }
}
