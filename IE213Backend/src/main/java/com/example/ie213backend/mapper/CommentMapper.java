package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.CommentDto.CreateCommentDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Comment;
import com.example.ie213backend.domain.model.User;
import com.example.ie213backend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;
import org.springframework.beans.factory.annotation.Autowired;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE, uses = {UserMapper.class})
public abstract class CommentMapper {
    @Autowired
    private UserService userService;

    @Autowired
    private UserMapper userMapper;

    @Mapping(target = "owner", source = "owner", qualifiedByName = "mapOwnerIdToUserDto")
    public abstract CommentDto toDto(Comment comment);

    @Mapping(target = "owner", source = "owner", qualifiedByName = "mapUserDtoToOwnerId")
    public abstract Comment toEntity(CommentDto commentDto);

    public abstract Comment toEntity(CreateCommentDto createCommentDto);

    @Named("mapOwnerIdToUserDto")
    public UserDto mapOwnerIdToUserDto(String ownerId) {
        if(ownerId == null) return null;
        User owner = userService.getUserById(ownerId);

        return userMapper.toDto(owner);
    }

    @Named("mapUserDtoToOwnerId")
    public String mapUserDtoToOwnerId(UserDto userDto) {
        return userDto != null ? userDto.getId() : null;
    }
}
