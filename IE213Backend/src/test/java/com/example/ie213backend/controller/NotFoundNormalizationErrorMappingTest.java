package com.example.ie213backend.controller;

import com.example.ie213backend.domain.dto.ApiErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Pure-JVM unit test (no @SpringBootTest, no live Mongo) proving the FROZEN
 * ErrorController mapping mechanism carries both HTTP statuses this sprint
 * relies on: ResponseStatusException(NOT_FOUND) -> 404 and
 * ResponseStatusException(FORBIDDEN) -> 403. Constructs ErrorController
 * directly, following the SecHardeningErrorMappingTest precedent.
 */
class NotFoundNormalizationErrorMappingTest {

    private final ErrorController errorController = new ErrorController();

    @Test
    void responseStatusException_notFound_mapsTo404() {
        ResponseEntity<ApiErrorResponse> response =
                errorController.handleResponseStatusException(new ResponseStatusException(HttpStatus.NOT_FOUND, "x"));

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.NOT_FOUND.value(), response.getBody().getStatus());
    }

    @Test
    void responseStatusException_forbidden_mapsTo403() {
        ResponseEntity<ApiErrorResponse> response =
                errorController.handleResponseStatusException(new ResponseStatusException(HttpStatus.FORBIDDEN, "x"));

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(HttpStatus.FORBIDDEN.value(), response.getBody().getStatus());
    }
}
