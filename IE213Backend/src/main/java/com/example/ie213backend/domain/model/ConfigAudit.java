package com.example.ie213backend.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Append-only audit trail entry for a single config write. Exactly one
 * document is inserted per successful PUT
 * /api/v1/admin/config/{key} - never updated, never deleted (see
 * ConfigAuditRepository, which declares finders only). entityType is a
 * constant "CONFIG" for every doc created this sprint (room for future
 * entity types without a schema change). oldValue/newValue hold the closed
 * registry's non-secret config value strings - never a secret.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "config_audit")
public class ConfigAudit {
    @Id
    private String id;
    private String entityType;
    private String key;
    private String oldValue;
    private String newValue;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private String traceId;
}
