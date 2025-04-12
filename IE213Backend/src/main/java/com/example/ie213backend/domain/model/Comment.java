package com.example.ie213backend.domain.model;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

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

    @Indexed
    private String owner;
    private List<Interaction> interactions;

    @Indexed
    private String blogId;

    @Indexed
    private String parentCommentId;

    @CreatedDate
    private Instant createdAt;
}
