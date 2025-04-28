package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.CommentDto.CommentReactionDto;
import com.example.ie213backend.domain.model.CommentReaction;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CommentReactionMapper {
    CommentReactionDto toDto(CommentReaction commentReaction);
}
