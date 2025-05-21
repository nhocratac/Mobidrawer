package com.example.ie213backend.domain.dto.UserDto;


import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.UserRoles;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserDto {
    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String avatarUrl;
    private UserRoles role;
    private Plans plan;
    private String userPlansId;
}
