package com.example.ie213backend.mapper;


import com.example.ie213backend.domain.dto.ImageDto.CreateImage;
import com.example.ie213backend.domain.dto.ImageDto.MoveImage;
import com.example.ie213backend.domain.dto.ImageDto.ResizeImage;
import com.example.ie213backend.domain.model.Image;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;
import org.mapstruct.factory.Mappers;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ImageMapper {
    ImageMapper INSTANCE = Mappers.getMapper(ImageMapper.class);

    Image CreateDtoImage(CreateImage dto);

    Image MoveToDtoImage(MoveImage dto);

    Image ResizeDtoImage(ResizeImage dto);

}
