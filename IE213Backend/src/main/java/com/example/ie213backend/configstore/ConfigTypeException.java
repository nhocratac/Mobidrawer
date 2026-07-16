package com.example.ie213backend.configstore;

/**
 * Thrown when a stored config value cannot be coerced to the registry's
 * declared type. Fail-fast: never caught and swallowed to a default.
 */
public class ConfigTypeException extends RuntimeException {
    public ConfigTypeException(String key, String expectedType) {
        super("Config key '" + key + "' value is not coercible to expected type " + expectedType);
    }
}
