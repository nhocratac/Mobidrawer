package com.example.ie213backend.configstore;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Typed, fail-fast reads over the ConfigCache. Never touches Mongo. A key
 * absent from the cache throws ConfigMissingException; a stored value not
 * coercible to the declared type throws ConfigTypeException. No catch block
 * here ever falls back to the registry default - the default exists only for
 * ConfigSeeder.
 */
@Service
@RequiredArgsConstructor
public class ConfigService {

    private final ConfigCache configCache;

    public int getInt(ConfigKey<Integer> key) {
        String raw = readRaw(key);
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            throw new ConfigTypeException(key.getKey(), "Int");
        }
    }

    public long getLong(ConfigKey<Long> key) {
        String raw = readRaw(key);
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            throw new ConfigTypeException(key.getKey(), "Long");
        }
    }

    private String readRaw(ConfigKey<?> key) {
        String raw = configCache.get(key.getKey());
        if (raw == null) {
            throw new ConfigMissingException(key.getKey());
        }
        return raw;
    }
}
