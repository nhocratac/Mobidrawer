package com.example.ie213backend.domain.dto.AuthDto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class VerifyForgetPassword {
    @NotBlank(message = "Không để trống email")
    //@Pattern( regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "Vui long nhap dung dinh dang email")
    @Email(message = "Vui lòng nhập đúng định dạng email")
    private String email;

    @NotBlank(message = "Không để trống trường mật khẩu")
    @Size(min = 6, max = 30)
    private String password;

    @Size(min=6, max=6)
    private String code;
}
