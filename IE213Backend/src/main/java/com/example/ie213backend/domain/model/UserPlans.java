package com.example.ie213backend.domain.model;

import com.example.ie213backend.domain.Plans;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;
import java.time.LocalDateTime;

@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "user_plans")
public class UserPlans {
    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private String userId;
    private Plans plan;
    private long amount;

    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private String orderCode;
    private boolean active;
}
