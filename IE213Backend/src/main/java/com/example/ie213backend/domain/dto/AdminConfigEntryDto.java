package com.example.ie213backend.domain.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * One row of the admin config view: exactly 8 fields, no more. Registry
 * metadata (key/category/type/description) is always authoritative; value/
 * updatedBy/updatedAt come from the matched app_config row (null when
 * unseeded); seeded is true iff a row matched. No defaultValue, no id, no
 * env-derived field is ever exposed here (AC-5).
 */
@Getter
@AllArgsConstructor
public class AdminConfigEntryDto {
    private final String key;
    private final String category;
    private final String type;
    private final String description;
    private final String value;
    private final String updatedBy;
    private final LocalDateTime updatedAt;
    private final boolean seeded;
}
