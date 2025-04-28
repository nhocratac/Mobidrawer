package com.example.ie213backend.domain.dto.CommentDto;

import com.example.ie213backend.domain.ReactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class CommentReactInfoDto {
    private int likeCount;
    private int dislikeCount;
    private ReactionType currentUserReaction;
}
