package com.example.ie213backend.domain.dto.UserDto;


import com.example.ie213backend.domain.Plans;
import com.example.ie213backend.domain.UserRoles;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Transient;

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

    @Transient
    private String color;

    public String getColor() {
        if(color == null && firstName != null) {
            int hash = firstName.hashCode() & 0xFFFFFF;
            String hex = String.format("%06x", hash);
            color = "#" + hex.substring(Math.max(0, hex.length() - 6));
        }
        return color;
    }
}
