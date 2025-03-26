package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.StickyNote.CreateStickyNote;
import com.example.ie213backend.domain.dto.StickyNote.MoveStickyNote;
import com.example.ie213backend.domain.dto.StickyNote.StickyNoteDto;
import com.example.ie213backend.domain.model.StickyNote;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface StickyNoteMapper {

    StickyNoteMapper INSTANCE = Mappers.getMapper(StickyNoteMapper.class);

    StickyNote createToEntity(CreateStickyNote createStickyNote);


    StickyNoteDto toDTO(StickyNote stickyNote);

    MoveStickyNote toMoveStickyNote(StickyNote StickyNote);

}
