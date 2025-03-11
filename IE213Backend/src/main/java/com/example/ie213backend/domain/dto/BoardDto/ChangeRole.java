package com.example.ie213backend.domain.dto.BoardDto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ChangeRole {
    @NotBlank(message = "vui lòng nhập trường memberId") String memberId;
    @NotBlank(message = "vui lòng nhập trường role") String role;
}
