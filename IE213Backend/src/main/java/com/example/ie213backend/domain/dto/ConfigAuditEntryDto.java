package com.example.ie213backend.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * One row of GET /api/v1/admin/config/audit: exactly 7 fields, mirroring
 * ConfigAudit minus the Mongo id - the raw entity and its id are never
 * serialized.
 */
@Getter
@AllArgsConstructor
public class ConfigAuditEntryDto {
    private final String entityType;
    private final String key;
    private final String oldValue;
    private final String newValue;
    private final String updatedBy;
    private final LocalDateTime updatedAt;
    private final String traceId;
}
