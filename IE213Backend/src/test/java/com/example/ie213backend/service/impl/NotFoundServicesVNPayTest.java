package com.example.ie213backend.service.impl;

import com.example.ie213backend.repository.UserPlansRepository;
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
 * the SEC-5b conversion in VNPayServiceImpl: getUserPlanInfo(missing) (former
 * L174) now throws ResponseStatusException(NOT_FOUND) instead of
 * IllegalArgumentException. UserPlansRepository.findById is stubbed via a
 * hand-rolled JDK-Proxy fake to return Optional.empty(); unused constructor
 * deps are passed as null since the orElseThrow fires before
 * userPlanMapper.toDto is ever reached. The preserved payment
 * validation/signature sites (L139/L164/L167) are not exercised by this
 * class since validPayment requires a populated HttpServletRequest and Redis
 * lookup beyond pure-JVM scope; their preservation is confirmed statically
 * (AC-2's mandatory Read + residual-count tripwire).
 */
class NotFoundServicesVNPayTest {

    @Test
    void getUserPlanInfo_missing_throws404() {
        UserPlansRepository userPlansRepository = proxyRepository(UserPlansRepository.class, Map.of(
                "findById", (Function<Object[], Object>) args -> Optional.empty()
        ));

        VNPayServiceImpl service = new VNPayServiceImpl(
                null, userPlansRepository, null, null, null, null, null, null, null);

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.getUserPlanInfo("missing-plan", null));

        assertEquals(HttpStatus.NOT_FOUND, ex.getStatusCode());
        assertEquals("Không tìm thấy plan với id: missing-plan", ex.getReason());
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
