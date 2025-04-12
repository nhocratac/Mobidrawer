package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.BoardDto.BoardDTO;
import com.example.ie213backend.domain.dto.BoardDto.CreateBoard;
import com.example.ie213backend.domain.model.Board;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;


import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface BoardMapper {
    BoardMapper INSTANCE = Mappers.getMapper(BoardMapper.class);

    BoardDTO toDTO(Board board);

    Board toEntity(BoardDTO boardDTO);

    Board createBoardToEntity(CreateBoard createBoard);

}
