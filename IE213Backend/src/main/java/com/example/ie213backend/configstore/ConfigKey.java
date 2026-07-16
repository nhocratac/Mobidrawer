package com.example.ie213backend.configstore;

/**
 * Generic registry entry: key string, type discriminator, default value,
 * category and description. Immutable value object.
 */
public final class ConfigKey<T> {
    private final String key;
    private final ConfigValueType type;
    private final T defaultValue;
    private final String category;
    private final String description;

    public ConfigKey(String key, ConfigValueType type, T defaultValue, String category, String description) {
        this.key = key;
        this.type = type;
        this.defaultValue = defaultValue;
        this.category = category;
        this.description = description;
    }

    public String getKey() {
        return key;
    }

    public ConfigValueType getType() {
        return type;
    }

    public T getDefaultValue() {
        return defaultValue;
    }

    public String getCategory() {
        return category;
    }

    public String getDescription() {
        return description;
    }
}
