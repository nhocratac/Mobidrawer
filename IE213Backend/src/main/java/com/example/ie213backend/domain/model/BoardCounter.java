package com.example.ie213backend.domain.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

// Bộ đếm seq theo board; committedSeq = seqTo lớn nhất đã active
@Data
@NoArgsConstructor
@Document(collection = "boardCounters")
public class BoardCounter {

    // = boardId (hex)
    @Id
    private String id;

    private long seq;
    private long committedSeq;
}
