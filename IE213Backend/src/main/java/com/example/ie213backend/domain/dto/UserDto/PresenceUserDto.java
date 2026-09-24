package com.example.ie213backend.domain.dto.UserDto;

/**
 * Slim presence view of a user broadcast on /topic/board/{boardId}.
 * Deliberately excludes email, phone, role, plan and userPlansId.
 */
public record PresenceUserDto(String id, String firstName, String lastName, String avatarUrl, String color) {

    public static PresenceUserDto from(UserDto user) {
        return new PresenceUserDto(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getAvatarUrl(),
                user.getColor());
    }
}
