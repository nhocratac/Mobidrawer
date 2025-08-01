package com.example.ie213backend.domain.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "comments")
public class Comment {
    @Id
    private String id;
    private String content;
    private boolean parentComment;
    private boolean edited;

    @Indexed
    @Field(targetType = FieldType.OBJECT_ID)
    private String userId;

    @Indexed
    @Field(targetType = FieldType.OBJECT_ID)
    private String blogId;

    @Indexed
    @Field(targetType = FieldType.OBJECT_ID)
    private String repliedId;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
