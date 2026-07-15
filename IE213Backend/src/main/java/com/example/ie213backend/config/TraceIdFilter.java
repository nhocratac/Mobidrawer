package com.example.ie213backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.logging.log4j.ThreadContext;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Reads (or generates) a per-request trace id and makes it available to the
 * logging layer via {@link ThreadContext} so every log line emitted while
 * handling the request can carry %X{traceId}.
 * <p>
 * Registered ahead of the security filter chain: a servlet {@link jakarta.servlet.Filter}
 * bean annotated {@link Component} with {@link Order#value()} =
 * {@link Ordered#HIGHEST_PRECEDENCE} is auto-registered by Spring Boot in the
 * servlet container ahead of DelegatingFilterProxy (order -100), so no
 * SecurityConfig change is required.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {

    public static final String TRACE_ID_HEADER = "X-Trace-Id";
    public static final String TRACE_ID_MDC_KEY = "traceId";

    // Length-capped (<=64) AND charset-guarded (no CR/LF/control chars) in a single construct.
    private static final Pattern SAFE_TRACE_ID = Pattern.compile("[A-Za-z0-9._-]{1,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String incoming = request.getHeader(TRACE_ID_HEADER);
        String traceId = (incoming != null && SAFE_TRACE_ID.matcher(incoming.trim()).matches())
                ? incoming.trim()
                : UUID.randomUUID().toString();

        ThreadContext.put(TRACE_ID_MDC_KEY, traceId);
        response.setHeader(TRACE_ID_HEADER, traceId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            ThreadContext.remove(TRACE_ID_MDC_KEY);
        }
    }
}
