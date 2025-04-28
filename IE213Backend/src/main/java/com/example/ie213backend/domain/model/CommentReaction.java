package com.example.ie213backend.domain.model;

import com.example.ie213backend.domain.ReactionType;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.mapping.FieldType;

import java.time.Instant;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Document(collection = "commentReactions")
@CompoundIndex(name = "user_comment_idx", def = "{'userId': 1, 'commentId': 1}", unique = true)
public class CommentReaction {
    @Id
    private String id;

    @Indexed
    @Field(targetType = FieldType.OBJECT_ID)
    private String commentId;

    @Indexed
    @Field(targetType = FieldType.OBJECT_ID)
    private String userId;

    private ReactionType type;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
