package com.example.ie213backend.configstore;

/**
 * Type discriminator for registry values. Adding a new supported type is a new
 * enum entry plus one coercion branch/getter - not a redesign of the registry.
 */
public enum ConfigValueType {
    INT,
    LONG
}
