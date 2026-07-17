package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.ApiErrorResponse;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Pure-JVM unit tests for BUG 3b — direct invocation of ErrorController's new
 * base io.jsonwebtoken.JwtException handler (no MVC context, no Mockito),
 * covering all three refresh-path failure-mode instances named in the
 * contract: malformed, forged-signature, and the explicit wrong-type
 * JwtException.
 */
class SecHardeningErrorMappingTest {

    private final ErrorController errorController = new ErrorController();

    @Test
    void malformedJwtException_returns401() {
        assertUnauthorized(errorController.handleJwtException(new MalformedJwtException("garbage token")));
    }

    @Test
    void forgedSignatureException_returns401() {
        assertUnauthorized(errorController.handleJwtException(new SignatureException("forged/tampered token")));
    }

    @Test
    void wrongTypeJwtException_returns401() {
        assertUnauthorized(errorController.handleJwtException(new JwtException("Wrong type of token!")));
    }

    private void assertUnauthorized(ResponseEntity<ApiErrorResponse> response) {
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.UNAUTHORIZED.value(), response.getBody().getStatus());
    }
}
