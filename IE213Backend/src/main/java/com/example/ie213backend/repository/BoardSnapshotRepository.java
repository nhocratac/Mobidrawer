package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.BoardSnapshot;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface BoardSnapshotRepository extends MongoRepository<BoardSnapshot, String> {
    // Snapshot gần nhất có seq ≤ N
    Optional<BoardSnapshot> findFirstByBoardIdAndSeqLessThanEqualOrderBySeqDesc(String boardId, long seq);
}
