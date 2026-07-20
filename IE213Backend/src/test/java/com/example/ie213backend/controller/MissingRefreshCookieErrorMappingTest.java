package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.ApiErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingRequestCookieException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Pure-JVM unit test for SEC-4 — direct invocation of ErrorController's new
 * MissingRequestCookieException handler (no MVC context, no Mockito),
 * proving an absent refreshToken cookie maps to 401 instead of the
 * runtime-confirmed 500 catch-all.
 */
class MissingRefreshCookieErrorMappingTest {

    private final ErrorController errorController = new ErrorController();

    @Test
    void missingRefreshTokenCookie_returns401() throws NoSuchMethodException {
        MethodParameter parameter = new MethodParameter(
                MissingRefreshCookieErrorMappingTest.class.getDeclaredMethod(
                        "missingRefreshTokenCookie_returns401"),
                -1);
        MissingRequestCookieException ex = new MissingRequestCookieException("refreshToken", parameter);

        ResponseEntity<ApiErrorResponse> response = errorController.handleMissingRequestCookieException(ex);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.UNAUTHORIZED.value(), response.getBody().getStatus());
    }
}
