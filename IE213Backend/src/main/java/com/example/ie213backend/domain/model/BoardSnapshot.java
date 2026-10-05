package com.example.ie213backend.domain.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.util.List;
import java.util.Map;

// Ảnh chụp toàn bộ elements (đã chuẩn hóa) của board tại seq
@Data
@NoArgsConstructor
@Document(collection = "boardSnapshots")
@CompoundIndex(name = "snap_board_seq", def = "{'boardId':1,'seq':1}", unique = true)
public class BoardSnapshot {

    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    private long seq;
    private List<Map<String, Object>> elements;
}
