package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.BlogDto.BlogDto;
import com.example.ie213backend.domain.dto.BlogDto.CreateBlogDto;
import com.example.ie213backend.domain.dto.CommentDto.CommentDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import com.example.ie213backend.domain.model.Blog;
import com.example.ie213backend.service.CommentService;
import com.example.ie213backend.service.UserService;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public abstract class BlogMapper {
    @Autowired
    private UserService userService;

    @Autowired
    private UserMapper userMapper;

    @Mapping(target = "owner", source = "owner", qualifiedByName = "mapOwnerIdToOwner")
    public abstract BlogDto toDto(Blog blog);

    @Mapping(target = "owner", source = "owner", qualifiedByName = "mapOwnerToOwnerId")
    public abstract Blog toEntity(BlogDto blogDto);

    public abstract Blog toEntity(CreateBlogDto createBlogDto);

    @Named("mapOwnerIdToOwner")
    public UserDto mapOwnerIdToOwner(String ownerId) {
        return userMapper.toDto(userService.getUserById(ownerId));
    }

    @Named("mapOwnerToOwnerId")
    public String mapOwnerToOwnerId(UserDto owner) {
        return owner.getId();
    }
}
