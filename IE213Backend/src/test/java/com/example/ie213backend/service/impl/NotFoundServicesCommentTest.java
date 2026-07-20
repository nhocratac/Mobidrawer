package com.example.ie213backend.service.impl;

import com.example.ie213backend.domain.dto.CommentDto.UpdateCommentDto;
import com.example.ie213backend.domain.model.Comment;
import com.example.ie213backend.repository.CommentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Proxy;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pure-JVM unit tests (no Spring Boot test context, no live Mongo, no mocking framework) proving
 * the SEC-5b conversion AND preservation in CommentServiceImpl:
 *
 * (a) deleteComment(missing) (former L101, MIXED not-found/permission site
 *     ruled NOT_FOUND) now throws ResponseStatusException(NOT_FOUND) instead
 *     of IllegalArgumentException. CommentRepository.findByIdAndUserId is
 *     stubbed to return Optional.empty(); the orElseThrow fires before
 *     deepDelete is ever reached, so all other deps can stay null.
 * (b) PRESERVATION: updateComment with a caller whose id differs from the
 *     stubbed comment's owner still throws IllegalArgumentException (NOT
 *     ResponseStatusException) — former L90 remains a permission error, not
 *     a not-found error. CommentRepository.findById is stubbed to return a
 *     Comment owned by a different user; all other deps stay null since
 *     getCommentById/the ownership check are reached before any of them.
 */
class NotFoundServicesCommentTest {

    @Test
    void deleteComment_missing_throws404() {
        CommentRepository commentRepository = proxyRepository(CommentRepository.class, Map.of(
                "findByIdAndUserId", (Function<Object[], Object>) args -> Optional.empty()
        ));

        CommentServiceImpl service = new CommentServiceImpl(
                commentRepository, null, null, null, null, null, null, null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.deleteComment("missing-comment", "user-1"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Comment not found or you dont have permission", ex.getReason());
    }

    @Test
    void updateComment_nonOwner_stillThrowsIllegalArgumentException() {
        Comment ownedByOther = Comment.builder()
                .id("comment-1")
                .userId("owner-1")
                .content("original")
                .build();

        CommentRepository commentRepository = proxyRepository(CommentRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> Optional.of(ownedByOther)
        ));

        CommentServiceImpl service = new CommentServiceImpl(
                commentRepository, null, null, null, null, null, null, null);

        UpdateCommentDto dto = UpdateCommentDto.builder()
                .commentId("comment-1")
                .currentUserId("stranger-1")
                .content("edited")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> service.updateComment(dto));

        assertEquals("You are not allowed to update this comment", ex.getMessage());
    }

    @SuppressWarnings("unchecked")
    private static <T> T proxyRepository(Class<T> iface, Map<String, Function<Object[], Object>> behaviors) {
        return (T) Proxy.newProxyInstance(
                iface.getClassLoader(),
                new Class<?>[]{iface},
                (proxy, method, args) -> {
                    Function<Object[], Object> behavior = behaviors.get(method.getName());
                    if (behavior != null) {
                        return behavior.apply(args == null ? new Object[0] : args);
                    }
                    switch (method.getName()) {
                        case "hashCode":
                            return System.identityHashCode(proxy);
                        case "equals":
                            return proxy == args[0];
                        case "toString":
                            return iface.getSimpleName() + "Proxy";
                        default:
                            throw new UnsupportedOperationException("Unstubbed method: " + method.getName());
                    }
                });
    }
}
