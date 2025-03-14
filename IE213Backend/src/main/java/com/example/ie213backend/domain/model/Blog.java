package com.example.ie213backend.domain.model;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "blogs")
public class Blog {
    @Id
    private String id;
    private String title;
    private String description;
    private String thumbnail;
    private String content;

    @Indexed
    private String owner;
    private List<Interaction> interactions;

    @CreatedDate
    private Instant createdAt;
}
