package com.example.ie213backend.domain.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;
import java.util.List;

// Một giao dịch ghi element; pending là WAL một document (atomic)
@Data
@NoArgsConstructor
@Document(collection = "boardTxs")
@CompoundIndexes({
        @CompoundIndex(name = "tx_user", def = "{'boardId':1,'userId':1,'seqTo':-1}"),
        @CompoundIndex(name = "tx_board", def = "{'boardId':1,'seqTo':-1}"),
        @CompoundIndex(name = "tx_state", def = "{'boardId':1,'state':1}")
})
public class BoardTx {

    @Id
    private String id;

    @Field(targetType = FieldType.OBJECT_ID)
    private String boardId;

    private String userId;
    private Instant ts;
    private long seqFrom;
    private long seqTo;

    // user | undo | redo | restore | template
    private String source;
    private String target;
    private String mergeKey;

    // pending | active | undone | dead
    private String state;

    private Pending pending;
    private Prev prev;
    private Summary summary;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pending {
        private long seqFrom;
        private long seqTo;
        private List<BoardOp> ops;
    }

    // Trạng thái trước lần merge gần nhất, để revert
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Prev {
        private long seqTo;
        private Summary summary;
        private Instant ts;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private int created;
        private int patched;
        private int deleted;
    }
}
