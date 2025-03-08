package com.example.ie213backend.mapper;

import com.example.ie213backend.dto.BoardDto.CreateBoard;
import com.example.ie213backend.model.Board;
import org.springframework.stereotype.Component;

@Component
public class BoardMapper {
    public static CreateBoard toDTO(Board board) {
        if (board == null) {
            return null;
        }

        CreateBoard dto = new CreateBoard();
        dto.setId(board.get_id());
        dto.setName(board.getName());
        dto.setLastOpened(board.getLastOpened());
        dto.setOwner(board.getOwner());
        dto.setType(board.getType());
        dto.setDescription(board.getDescription());

        if (board.getOption() != null) {
            CreateBoard.OptionDTO optionDTO = new CreateBoard.OptionDTO();
            optionDTO.setGrid(board.getOption().isGrid());
            optionDTO.setBackgroundColor(board.getOption().getBackgroundColor());
            dto.setOption(optionDTO);
        }

        return dto;
    }
}
