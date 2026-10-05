package com.example.ie213backend.domain.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;
import java.util.Map;

// Một op trong log lịch sử element: create | patch | delete, before/after đã chuẩn hóa
@Data
@NoArgsConstructor
@Document(collection = "boardOps")
@CompoundIndexes({
        @CompoundIndex(name = "board_seq", def = "{'boardId':1,'seq':1}", unique = true),
        @CompoundIndex(name = "board_el_seq", def = "{'boardId':1,'elementId':1,'seq':-1}")
})
public class BoardOp {

    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    private long seq;
    private String txId;
    private String userId;
    private Instant ts;

    // create | patch | delete
    private String kind;
    private String elementId;

    private Map<String, Object> before;
    private Map<String, Object> after;
    private Map<String, Long> fsBefore;
    private Map<String, Long> fsAfter;

    // version sau op (delete: version trước khi xóa)
    private long v;
}
