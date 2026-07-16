package com.example.ie213backend.configstore;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Pure-JVM unit test for ConfigService. No Spring context, no Mongo/Redis -
 * ConfigCache is mocked directly.
 */
class ConfigServiceTest {

    static {
        // Byte Buddy (Mockito's bytecode engine) does not yet officially recognize
        // Java 25 class file versions; this opts into its forward-compatible mode.
        // No pom/config changes needed - this only affects this JVM's Mockito use.
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    @Test
    void getInt_happyPath_returnsCoercedValue() {
        ConfigCache cache = Mockito.mock(ConfigCache.class);
        Mockito.when(cache.get(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getKey())).thenReturn("3");
        ConfigService service = new ConfigService(cache);

        int result = service.getInt(ConfigKeys.BOARD_FREE_MAX_MEMBERS);

        assertEquals(3, result);
    }

    @Test
    void getLong_happyPath_returnsCoercedValue() {
        ConfigCache cache = Mockito.mock(ConfigCache.class);
        Mockito.when(cache.get(ConfigKeys.CACHE_DEFAULT_TTL_MS.getKey())).thenReturn("600000");
        ConfigService service = new ConfigService(cache);

        long result = service.getLong(ConfigKeys.CACHE_DEFAULT_TTL_MS);

        assertEquals(600000L, result);
    }

    @Test
    void getInt_nonCoercibleValue_throwsConfigTypeException() {
        ConfigCache cache = Mockito.mock(ConfigCache.class);
        Mockito.when(cache.get(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES.getKey())).thenReturn("abc");
        ConfigService service = new ConfigService(cache);

        ConfigTypeException ex = assertThrows(ConfigTypeException.class,
                () -> service.getInt(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES));

        assertEquals(true, ex.getMessage().contains(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES.getKey()));
    }

    @Test
    void getInt_absentKey_throwsConfigMissingException() {
        ConfigCache cache = Mockito.mock(ConfigCache.class);
        Mockito.when(cache.get(ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE.getKey())).thenReturn(null);
        ConfigService service = new ConfigService(cache);

        ConfigMissingException ex = assertThrows(ConfigMissingException.class,
                () -> service.getInt(ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE));

        assertEquals(true, ex.getMessage().contains(ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE.getKey()));
    }
}
