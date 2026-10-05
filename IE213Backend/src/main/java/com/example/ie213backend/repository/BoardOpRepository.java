package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardOp;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface BoardOpRepository extends MongoRepository<BoardOp, String> {
    List<BoardOp> findByBoardIdAndTxIdOrderBySeqAsc(String boardId, String txId);
}
