package com.example.ie213backend.domain.dto.UserDto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateUserDto {
    @NotBlank(message = "khong de trong truong email")
    //@Pattern( regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", message = "Vui long nhap dung dinh dang email")
    @Email(message = "Vui lòng nhập đúng định dạng email")
    private String email;
    @NotBlank
    private String firstName;
    @NotBlank
    private String lastName;
    @NotBlank
    @Size(min = 6, max = 30,message = "Mật khẩu tối thiểu 6 ký tự và tối đa 30 ký tự")
    private String password;
    private String phone;
}
