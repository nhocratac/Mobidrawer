package com.example.ie213backend.mapper;

import com.example.ie213backend.domain.dto.UserDto.userResponse;
import com.example.ie213backend.domain.dto.UserDto.userUpdateDto;
import com.example.ie213backend.domain.model.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    public userResponse toDto(User user) {
        userResponse dto = new userResponse();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhone(user.getPhone());
        return dto;
    }

    public User toEntity (userResponse dto) {
        User user = new User();
        user.setId(dto.getId());
        user.setEmail(dto.getEmail());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setPhone(dto.getPhone());
        return user;
    }

    public void updateEntity(User user, userUpdateDto dto) {
        user.setPhone(dto.getPhone());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setEmail(dto.getEmail());
    }
}
