package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.model.Comment;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CommentMapper {
    CommentDto toDto(Comment comment);

//    @Mapping(target = "owner", source = "owner", qualifiedByName = "mapUserDtoToOwnerId")
//    Comment toEntity(CommentDto commentDto);

    Comment toEntity(CreateCommentDto createCommentDto);
}
