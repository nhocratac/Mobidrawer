package com.example.ie213backend.domain.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * Persistence model for the typed config store. One document per registry key.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "app_config")
public class ConfigItem {
    @Id
    private String id;
    private String key;
    private String value;
    private String type;
    private String category;
    private String description;
    private LocalDateTime updatedAt;
    private String updatedBy;
}
