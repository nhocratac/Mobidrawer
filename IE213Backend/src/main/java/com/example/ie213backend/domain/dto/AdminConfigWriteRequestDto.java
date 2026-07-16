package com.example.ie213backend.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * PUT /api/v1/admin/config/{key} request body: exactly one field, the raw
 * value string to validate/persist. The actor identity is NEVER read from
 * this body - it comes solely from the authenticated @RequestAttribute
 * ("user") principal.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AdminConfigWriteRequestDto {
    private String value;
}
