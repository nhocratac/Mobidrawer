package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.model.ConfigItem;
import com.example.ie213backend.repository.ConfigItemRepository;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory holder for config values. Loaded fully at startup AFTER seeding
 * (see ConfigSeeder) and never touches Mongo from a getter path - only load()
 * (called by the seeder's startup path) and refresh() (public, for tests /
 * future sub-project #2) hit the repository.
 */
@Component
public class ConfigCache {

    private final ConfigItemRepository repository;
    private final ConcurrentHashMap<String, String> store = new ConcurrentHashMap<>();

    public ConfigCache(ConfigItemRepository repository) {
        this.repository = repository;
    }

    /**
     * Reloads the entire map from the repository. Called by ConfigSeeder's
     * startup path (after seeding) and by tests. Nothing else in production
     * code may call this.
     */
    public void refresh() {
        ConcurrentHashMap<String, String> fresh = new ConcurrentHashMap<>();
        for (ConfigItem item : repository.findAll()) {
            fresh.put(item.getKey(), item.getValue());
        }
        store.clear();
        store.putAll(fresh);
    }

    public String get(String key) {
        return store.get(key);
    }
}
