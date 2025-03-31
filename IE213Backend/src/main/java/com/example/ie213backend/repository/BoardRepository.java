package com.example.ie213backend.repository;

import com.example.ie213backend.domain.model.Board;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface BoardRepository extends MongoRepository<Board, ObjectId> {
    
    Board findByid(String id);

    Optional<Board> findById(String id);

    @Query("{'$or': [{'owner': ?0}, {'members.memberId': ?0}]}")
    List<Board> findByOwnerOrMembersMemberId(String userId);

    @Query(value = "{ '_id': ?0, '$or': [ { 'members.memberId': ?1 }, { 'owner': ?1 } ] }",
            fields = "{ 'members': 1 ,'owner': 1}")
    Optional<Board> findUserRoleInBoard(String boardId, String userId);
}
