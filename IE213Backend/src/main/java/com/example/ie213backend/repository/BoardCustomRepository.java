package com.example.ie213backend.repository;

import com.example.ie213backend.domain.dto.BoardDto.BoardFullDetailResponse;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class BoardCustomRepository {

    @Autowired
    private MongoTemplate mongoTemplate;

    public BoardFullDetailResponse getBoardWithCanvasPaths(String id) {
        Aggregation aggregation = Aggregation.newAggregation(
                // 1. Lọc Board theo ID
                Aggregation.match(Criteria.where("_id").is(new ObjectId(id))),
                // 2. Join Board với CanvasPath bằng boardId
                Aggregation.lookup(
                        "canvasPaths", // Collection cần join
                        "_id",         // Trường `_id` trong `boards`
                        "boardId",     // Trường `boardId` trong `canvasPaths`
                        "canvasPaths"  // Tên field chứa dữ liệu join
                )
        );

        // Thực thi aggregation
        AggregationResults<BoardFullDetailResponse> results =
                mongoTemplate.aggregate(aggregation, "boards", BoardFullDetailResponse.class);

        return results.getUniqueMappedResult(); // Trả về 1 kết quả duy nhất hoặc null
    }
}
