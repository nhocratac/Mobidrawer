package com.example.ie213backend.dto.AuthDto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterDto {
    @NotBlank(message = "Không để trống email")
    //@Pattern( regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "Vui long nhap dung dinh dang email")
    @Email(message = "Vui lòng nhập đúng định dạng email")
    private String email;

    @NotBlank( message = "không để trống trường Tên ")
    private String firstName;

    @NotBlank(message = "Không để trống trường Họ")
    private String lastName;

    @NotBlank(message = "Không để trống trường mật khẩu")
    @Size(min = 6, max = 30)
    private String password;

    @NotBlank(message = "Không để trống trường số điện thoại")
    private String phone;
}
