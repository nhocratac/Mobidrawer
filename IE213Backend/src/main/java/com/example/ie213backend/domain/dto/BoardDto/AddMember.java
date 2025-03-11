package com.example.ie213backend.domain.dto.BoardDto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AddMember {

    String email;

    String role;
}
