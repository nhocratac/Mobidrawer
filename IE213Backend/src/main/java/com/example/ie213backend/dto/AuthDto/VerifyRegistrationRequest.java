package com.example.ie213backend.dto.AuthDto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class VerifyRegistrationRequest {
    @NotBlank(message = "khong de trong truong email")
    @Email(message = "Vui lòng nhập đúng định dạng email")
    private String email;
    @Size(min=6, max=6)
    private String code;
}
