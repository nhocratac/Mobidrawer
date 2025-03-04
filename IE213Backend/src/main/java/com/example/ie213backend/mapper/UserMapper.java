package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.User;
import org.mapstruct.Mapper;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface UserMapper {

    UserDto toDto(User user);

    User toEntity(UserDto userDto);
}
