package com.example.ie213backend.service.impl;

import com.example.ie213backend.repository.UserRepository;
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
 * Pure-JVM unit test (no @SpringBootTest, no live Mongo, no Mockito) proving
 * the SEC-5b conversion in UserServiceImpl: getUserById(missing) now throws
 * ResponseStatusException(NOT_FOUND) instead of IllegalArgumentException.
 * UserRepository.findById is stubbed via a hand-rolled JDK-Proxy fake
 * (NotFoundNormalizationBoardServiceImplTest precedent) to return
 * Optional.empty(); unused constructor deps (emailService, passwordEncoder)
 * are passed as null since getUserById reaches the repository call first.
 */
class NotFoundServicesUserTest {

    @Test
    void getUserById_missing_throws404() {
        UserRepository userRepository = proxyRepository(UserRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> Optional.empty()
        ));

        UserServiceImpl service = new UserServiceImpl(userRepository, null, null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.getUserById("missing-user"));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("User not found with id: missing-user", ex.getReason());
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
