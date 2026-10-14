package com.example.ie213backend.domain.dto.UserDto;

import java.util.List;

/**
 * Presence payload for /topic/board/{boardId}. {@code seq} comes from one global
 * Redis counter so clients can drop a snapshot that arrives after a newer one.
 */
public record PresenceSnapshot(long seq, List<PresenceUserDto> users) {
}
