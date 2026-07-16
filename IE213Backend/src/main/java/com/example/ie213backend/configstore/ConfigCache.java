package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.model.ConfigItem;
import com.example.ie213backend.repository.ConfigItemRepository;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory holder for config values. Loaded fully at startup AFTER seeding
 * (see ConfigSeeder) and never touches Mongo from a getter path - only load()
 * (called by the seeder's startup path) and refresh() (public, called by the
 * seeder's startup path, by tests, and by the sub-project #2 reload webhook)
 * hit the repository.
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
     * startup path (after seeding), by tests, and by the reload webhook.
     * Snapshots the pre-refresh map BEFORE any mutation of {@code store} so
     * the changed-key count reflects the true diff rather than the post-clear
     * (always-empty) state, then swaps the store to the freshly loaded map.
     *
     * @return the number of keys added, removed, or value-changed versus the
     *         pre-refresh snapshot (0 on a no-op reload).
     */
    public int refresh() {
        ConcurrentHashMap<String, String> fresh = new ConcurrentHashMap<>();
        for (ConfigItem item : repository.findAll()) {
            fresh.put(item.getKey(), item.getValue());
        }

        Map<String, String> previous = new HashMap<>(store);

        Set<String> allKeys = new HashSet<>();
        allKeys.addAll(previous.keySet());
        allKeys.addAll(fresh.keySet());

        int changedKeys = 0;
        for (String key : allKeys) {
            if (!Objects.equals(previous.get(key), fresh.get(key))) {
                changedKeys++;
            }
        }

        store.clear();
        store.putAll(fresh);

        return changedKeys;
    }

    public String get(String key) {
        return store.get(key);
    }
}
