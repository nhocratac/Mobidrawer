package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.dto.AdminConfigEntryDto;
import com.example.ie213backend.domain.model.ConfigItem;
import com.example.ie213backend.repository.ConfigItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Read-only admin view over the config registry. The merge core (merge) is a
 * PURE function of List&lt;ConfigItem&gt; -> List&lt;AdminConfigEntryDto&gt; so it is
 * testable with hand-built POJOs, no Spring context, no repository double.
 * The instance method is a thin shell that sources rows from
 * ConfigItemRepository.findAll() (never ConfigCache - the cache lacks
 * updatedBy/updatedAt).
 */
@Service
@RequiredArgsConstructor
public class AdminConfigService {

    private final ConfigItemRepository configItemRepository;

    public List<AdminConfigEntryDto> getMergedConfig() {
        return merge(configItemRepository.findAll());
    }

    /**
     * LEFT JOIN of ConfigKeys.ALL (authoritative, drives iteration and count)
     * with the given rows matched by key. Registry supplies key/category/
     * type/description; a matched row supplies value/updatedBy/updatedAt and
     * seeded=true; an unmatched key yields seeded=false with null value/
     * updatedBy/updatedAt. Rows whose key is not in the registry are dropped.
     */
    public static List<AdminConfigEntryDto> merge(List<ConfigItem> rows) {
        Map<String, ConfigItem> byKey = rows.stream()
                .collect(Collectors.toMap(
                        ConfigItem::getKey,
                        Function.identity(),
                        (first, duplicate) -> first));

        List<AdminConfigEntryDto> result = new ArrayList<>();
        for (ConfigKey<?> registryKey : ConfigKeys.ALL) {
            ConfigItem row = byKey.get(registryKey.getKey());
            boolean seeded = row != null;
            result.add(new AdminConfigEntryDto(
                    registryKey.getKey(),
                    registryKey.getCategory(),
                    registryKey.getType().name(),
                    registryKey.getDescription(),
                    seeded ? row.getValue() : null,
                    seeded ? row.getUpdatedBy() : null,
                    seeded ? row.getUpdatedAt() : null,
                    seeded
            ));
        }
        return result;
    }
}
