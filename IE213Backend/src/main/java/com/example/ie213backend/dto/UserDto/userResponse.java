package com.example.ie213backend.dto.UserDto;

import lombok.Data;

@Data
public class userResponse {
    private String id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
}
