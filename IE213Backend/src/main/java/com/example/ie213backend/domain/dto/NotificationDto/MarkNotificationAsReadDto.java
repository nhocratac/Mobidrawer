package com.example.ie213backend.domain.dto.NotificationDto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
// The reader is taken from the JWT, never from the body; a legacy "userId" field is ignored.
@JsonIgnoreProperties(ignoreUnknown = true)
public class MarkNotificationAsReadDto {
    @NotNull
    private List<String> notificationIds;
}
