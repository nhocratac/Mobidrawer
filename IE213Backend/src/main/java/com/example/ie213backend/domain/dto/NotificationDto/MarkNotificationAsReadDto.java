package com.example.ie213backend.domain.dto.NotificationDto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class MarkNotificationAsReadDto {
    @NotBlank
    private String userId;

    @NotNull
    private List<String> notificationIds;
}
