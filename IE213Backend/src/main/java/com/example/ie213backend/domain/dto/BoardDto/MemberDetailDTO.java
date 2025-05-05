package com.example.ie213backend.domain.dto.BoardDto;

import lombok.Data;

@Data
public class MemberDetailDTO {
    String userId;
    String email;
    String avatar;
    String firstName;
    String lastName;
    String ROLE;
}
