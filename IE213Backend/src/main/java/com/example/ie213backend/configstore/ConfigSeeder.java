package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.model.ConfigItem;
import com.example.ie213backend.repository.ConfigItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Single seed-then-load ApplicationRunner: for every registry key, inserts the
 * default into app_config iff absent (idempotent, never overwrites), then
 * loads the ConfigCache. Seeding is guaranteed to complete before the cache
 * load in this same runner invocation - no @Order/@DependsOn race is possible
 * because there is exactly one runner doing both steps in sequence.
 */
@Component
@RequiredArgsConstructor
public class ConfigSeeder implements ApplicationRunner {

    private final ConfigItemRepository repository;
    private final ConfigCache configCache;

    @Override
    public void run(ApplicationArguments args) {
        for (ConfigKey<?> key : ConfigKeys.ALL) {
            seedIfAbsent(key);
        }
        configCache.refresh();
    }

    private void seedIfAbsent(ConfigKey<?> key) {
        if (repository.findByKey(key.getKey()).isPresent()) {
            return;
        }
        ConfigItem item = new ConfigItem();
        item.setKey(key.getKey());
        item.setValue(String.valueOf(key.getDefaultValue()));
        item.setType(key.getType().name());
        item.setCategory(key.getCategory());
        item.setDescription(key.getDescription());
        item.setUpdatedAt(LocalDateTime.now());
        item.setUpdatedBy("system-seed");
        repository.save(item);
    }
}
