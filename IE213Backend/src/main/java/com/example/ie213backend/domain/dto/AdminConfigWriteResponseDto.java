package com.example.ie213backend.domain.dto;

import lombok.Getter;

import java.time.LocalDateTime;

/**
 * PUT /api/v1/admin/config/{key} response: the save-result fields
 * {key, oldValue, newValue, updatedBy, updatedAt} and the reload-result
 * (ReloadResultDto) as a DISTINCT nested field. A reload failure is
 * reflected only inside `reload` - it never changes the HTTP status of
 * this response and never rolls back the save fields it carries.
 */
@Getter
public class AdminConfigWriteResponseDto {
    private final String key;
    private final String oldValue;
    private final String newValue;
    private final String updatedBy;
    private final LocalDateTime updatedAt;
    private final ReloadResultDto reload;

    public AdminConfigWriteResponseDto(String key, String oldValue, String newValue,
                                        String updatedBy, LocalDateTime updatedAt,
                                        ReloadResultDto reload) {
        this.key = key;
        this.oldValue = oldValue;
        this.newValue = newValue;
        this.updatedBy = updatedBy;
        this.updatedAt = updatedAt;
        this.reload = reload;
    }
}
