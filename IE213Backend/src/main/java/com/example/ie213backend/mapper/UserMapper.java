package com.example.ie213backend.mapper;

import com.example.ie213backend.model.User;
import org.springframework.stereotype.Component;
import com.example.ie213backend.dto.UserDto.*;

@Component
public class UserMapper {
    public userResponse toDto(User user) {
        userResponse dto = new userResponse();
        dto.setId(user.get_id());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhone(user.getPhone());
        return dto;
    }

    public User toEntity (userResponse dto) {
        User user = new User();
        user.set_id(dto.getId());
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
