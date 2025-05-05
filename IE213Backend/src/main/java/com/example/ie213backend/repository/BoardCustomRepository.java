package com.example.ie213backend.repository;

import com.example.ie213backend.domain.dto.BoardDto.BoardFullDetailResponse;
import com.example.ie213backend.domain.dto.BoardDto.MemberDetailDTO;
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
                ),
                Aggregation.lookup(
                        "stickyNote",
                        "_id",
                        "boardId",
                        "stickyNotes"
                )
        );

        // Thực thi aggregation
        AggregationResults<BoardFullDetailResponse> results =
                mongoTemplate.aggregate(aggregation, "boards", BoardFullDetailResponse.class);

        return results.getUniqueMappedResult(); // Trả về 1 kết quả duy nhất hoặc null
    }

    public List<MemberDetailDTO> getBoardMembersWithMinimalInfo(String boardId) {
        Aggregation aggregation = Aggregation.newAggregation(
                // 1. Match theo ID của board
                Aggregation.match(Criteria.where("_id").is(new ObjectId(boardId))),

                // 2. Unwind danh sách members
                Aggregation.unwind("members"),

                // 3. Join với users theo memberId
                Aggregation.lookup(
                        "users",                // collection
                        "members.memberId",     // local field
                        "_id",                  // foreign field
                        "userInfo"              // output field
                ),

                // 4. Lấy user đầu tiên (vì lookup trả về mảng)
                Aggregation.addFields()
                        .addField("user")
                        .withValue(ArrayOperators.ArrayElemAt.arrayOf("userInfo").elementAt(0))
                        .build(),

                // 5. Project chỉ các trường cần thiết
                Aggregation.project()
                        .and("user._id").as("userId")
                        .and("members.role").as("ROLE")
                        .and("user.email").as("email")
                        .and("user.firstName").as("firstName")
                        .and("user.lastName").as("lastName")
                        .and("user.avatar").as("avatar")
        );

        AggregationResults<MemberDetailDTO> results =
                mongoTemplate.aggregate(aggregation, "boards", MemberDetailDTO.class);

        return results.getMappedResults();
    }

    public MemberDetailDTO getOwnerWithMinimalInfo(String boardId) {
        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("_id").is(new ObjectId(boardId))),

                // JOIN owner với users
                Aggregation.lookup(
                        "users",
                        "owner",
                        "_id",
                        "ownerInfo"
                ),

                // Lấy phần tử đầu tiên từ mảng
                Aggregation.addFields()
                        .addField("ownerUser")
                        .withValue(ArrayOperators.ArrayElemAt.arrayOf("ownerInfo").elementAt(0))
                        .build(),

                // Thêm trường ROLE với giá trị cố định "OWNER"
                Aggregation.addFields()
                        .addField("ROLE")
                        .withValue("OWNER")
                        .build(),

                // Project về dạng MemberDetailDTO
                Aggregation.project()
                        .and("owner").as("userId")
                        .and("ownerUser.email").as("email")
                        .and("ownerUser.avatarUrl").as("avatar")
                        .and("ownerUser.firstName").as("firstName")
                        .and("ownerUser.lastName").as("lastName")
                        .and("ROLE").as("ROLE")
        );

        AggregationResults<MemberDetailDTO> results =
                mongoTemplate.aggregate(aggregation, "boards", MemberDetailDTO.class);

        return results.getUniqueMappedResult(); // Trả về 1 owner duy nhất
    }
}
