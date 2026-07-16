package com.example.ie213backend.configstore;

/**
 * Thrown when a registry key is absent from the loaded ConfigCache. Fail-fast:
 * never caught and swallowed to a default in the read path.
 */
public class ConfigMissingException extends RuntimeException {
    public ConfigMissingException(String key) {
        super("Config key missing from cache: " + key);
    }
}
