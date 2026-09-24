package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.UserDto.PresenceSnapshot;
import com.example.ie213backend.domain.dto.UserDto.UserDto;

import java.util.Map;

/**
 * Board presence keyed by STOMP session (not by user), so multiple tabs of the
 * same user are tracked independently and a dead session can be removed on disconnect.
 */
public interface CacheUserInBoardService {
    PresenceSnapshot join(String boardId, String sessionId, UserDto user);

    PresenceSnapshot leave(String boardId, String sessionId);

    /** Removes the session from every board it joined; returns only boards that actually changed. */
    Map<String, PresenceSnapshot> removeSession(String sessionId);

    PresenceSnapshot snapshot(String boardId);

    /** Wipes all presence:board:* and presence:session:* keys (keeps presence:seq). */
    void clearAll();
}
