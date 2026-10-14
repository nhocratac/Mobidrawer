package com.example.ie213backend.service.impl;

import com.example.ie213backend.repository.BlogRepository;
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
 * Pure-JVM unit test (no Spring Boot test context, no live Mongo, no mocking framework) proving
 * the SEC-5b conversion in BlogServiceImpl: getBlogById(missing) (former L35)
 * now throws ResponseStatusException(NOT_FOUND) instead of
 * IllegalArgumentException. BlogRepository.findById is stubbed via a
 * hand-rolled JDK-Proxy fake to return Optional.empty(); unused constructor
 * deps (userService, blogMapper) are passed as null since the orElseThrow
 * fires before blogMapper.toDto is ever reached.
 */
class NotFoundServicesBlogTest {

    @Test
    void getBlogById_missing_throws404() {
        BlogRepository blogRepository = proxyRepository(BlogRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> Optional.empty()
        ));

        BlogServiceImpl service = new BlogServiceImpl(blogRepository, null, null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.getBlogById("missing-blog"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Blog not found with id: missing-blog", ex.getReason());
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
