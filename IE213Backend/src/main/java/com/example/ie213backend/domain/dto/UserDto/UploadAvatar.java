package com.example.ie213backend.domain.dto.UserDto;

import jakarta.annotation.Nullable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UploadAvatar {
    @Nullable
    private String id;
    private String avatarUrl;
}
