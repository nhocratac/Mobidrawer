package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardTx;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface BoardTxRepository extends MongoRepository<BoardTx, String> {
    // WAL: tối đa một tx pending mỗi board
    Optional<BoardTx> findFirstByBoardIdAndState(String boardId, String state);

    // Undo stack: 50 tx mới nhất của user (source ∈ user|redo|restore), mọi state
    List<BoardTx> findTop50ByBoardIdAndUserIdAndSourceInOrderBySeqToDesc(String boardId, String userId,
                                                                         Collection<String> sources);

    // Redo: các tx undo của user, mới nhất trước
    List<BoardTx> findByBoardIdAndUserIdAndSourceOrderBySeqToDesc(String boardId, String userId, String source);
}
