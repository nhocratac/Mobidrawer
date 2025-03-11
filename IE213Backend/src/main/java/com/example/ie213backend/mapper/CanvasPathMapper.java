package com.example.ie213backend.mapper;


import com.example.ie213backend.domain.dto.CanvasPathDto.CanvasPathDto;
import com.example.ie213backend.domain.dto.CanvasPathDto.CreateCanvasPath;
import com.example.ie213backend.domain.model.CanvasPath;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface CanvasPathMapper {
    CanvasPathMapper INSTANCE = Mappers.getMapper(CanvasPathMapper.class);

    CanvasPathDto toDto (CanvasPath canvasPath);

    CanvasPath toEntity (CanvasPathDto canvasPathDto);

    CanvasPath createCanvasPathToEntity (CreateCanvasPath createCanvasPath);
}
