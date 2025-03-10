package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.BoardDto.BoardDTO;
import com.example.ie213backend.domain.dto.BoardDto.CreateBoard;
import com.example.ie213backend.domain.model.Board;
import jakarta.validation.Valid;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

import org.mapstruct.Mapping;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", uses = ObjectIdMapper.class, unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BoardMapper {
    BoardMapper INSTANCE = Mappers.getMapper(BoardMapper.class);

    @Mapping(source = "id", target = "id")
    @Mapping(source = "owner", target = "owner")
    @Mapping(source = "canvasPaths", target = "canvasPaths")
    BoardDTO toDTO(Board board);

    @Mapping(source = "id", target = "id")
    @Mapping(source = "owner", target = "owner")
    @Mapping(source = "canvasPaths", target = "canvasPaths")
    Board toEntity(BoardDTO boardDTO);

    @Mapping(source = "owner", target = "owner")
    Board createBoardToEntity(@Valid CreateBoard boardDTO);
}
