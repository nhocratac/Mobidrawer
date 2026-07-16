package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.dto.AdminConfigEntryDto;
import com.example.ie213backend.domain.dto.AdminConfigWriteResponseDto;
import com.example.ie213backend.domain.dto.ConfigAuditEntryDto;
import com.example.ie213backend.domain.dto.ReloadResultDto;
import com.example.ie213backend.domain.model.ConfigAudit;
import com.example.ie213backend.domain.model.ConfigItem;
import com.example.ie213backend.repository.ConfigAuditRepository;
import com.example.ie213backend.repository.ConfigItemRepository;
import lombok.RequiredArgsConstructor;
import org.apache.logging.log4j.ThreadContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Read-only admin view over the config registry (Sprint 1, unchanged) PLUS
 * the Sprint 2 write/reload/audit orchestration. The pure cores below
 * (merge, findKey, validateValue, buildWriteOutcome, buildAuditPageable)
 * require no Spring context and no repository double - they are exercised
 * directly by the Admin*Test suites with hand-built POJOs.
 */
@Service
@RequiredArgsConstructor
public class AdminConfigService {

    private static final String TRACE_ID_MDC_KEY = "traceId";

    private final ConfigItemRepository configItemRepository;
    private final ConfigAuditRepository configAuditRepository;
    private final ConfigReloadClient configReloadClient;

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

    // ---- AC-1: pure validator core, no Spring context required to invoke ----

    /** Registry lookup - pure function over the closed ConfigKeys.ALL catalog. */
    public static Optional<ConfigKey<?>> findKey(String keyPath) {
        return ConfigKeys.ALL.stream()
                .filter(k -> k.getKey().equals(keyPath))
                .findFirst();
    }

    /**
     * Validates rawValue against registryKey's ConfigValueType using the
     * SAME trim-then-parse semantics as ConfigService (Integer.parseInt /
     * Long.parseLong on the trimmed string). Throws a 400
     * ResponseStatusException naming both the key and the expected type on
     * failure; returns normally (no persistence side effect here) when
     * valid. Pure function: no Spring context/bean is needed to call it.
     */
    public static void validateValue(ConfigKey<?> registryKey, String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw badType(registryKey);
        }
        String trimmed = rawValue.trim();
        try {
            switch (registryKey.getType()) {
                case INT -> Integer.parseInt(trimmed);
                case LONG -> Long.parseLong(trimmed);
            }
        } catch (NumberFormatException e) {
            throw badType(registryKey);
        }
    }

    private static ResponseStatusException badType(ConfigKey<?> registryKey) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Config key '" + registryKey.getKey() + "' value is not coercible to expected type "
                        + registryKey.getType().name());
    }

    // ---- AC-2: pure write core ----

    /** Outcome of a validated write: the app_config row to save plus the config_audit doc to insert. */
    public record WriteOutcome(ConfigItem rowToSave, ConfigAudit auditEntry) {
    }

    /**
     * Pure function (registryKey, existingRowOrNull, rawValue, actorEmail,
     * now, traceId) -&gt; outcome. Never mutates existingRowOrNull; builds a
     * fresh ConfigItem carrying its id when present (update) or a null id
     * (create, registry metadata copied in). oldValue is the prior row's
     * value, or null when unseeded.
     */
    public static WriteOutcome buildWriteOutcome(ConfigKey<?> registryKey,
                                                  ConfigItem existingRowOrNull,
                                                  String rawValue,
                                                  String actorEmail,
                                                  LocalDateTime now,
                                                  String traceId) {
        String trimmedValue = rawValue.trim();
        String oldValue = existingRowOrNull != null ? existingRowOrNull.getValue() : null;

        ConfigItem row = new ConfigItem();
        if (existingRowOrNull != null) {
            row.setId(existingRowOrNull.getId());
        }
        row.setKey(registryKey.getKey());
        row.setType(registryKey.getType().name());
        row.setCategory(registryKey.getCategory());
        row.setDescription(registryKey.getDescription());
        row.setValue(trimmedValue);
        row.setUpdatedBy(actorEmail);
        row.setUpdatedAt(now);

        ConfigAudit audit = new ConfigAudit();
        audit.setEntityType("CONFIG");
        audit.setKey(registryKey.getKey());
        audit.setOldValue(oldValue);
        audit.setNewValue(trimmedValue);
        audit.setUpdatedBy(actorEmail);
        audit.setUpdatedAt(now);
        audit.setTraceId(traceId);

        return new WriteOutcome(row, audit);
    }

    /**
     * Service shell: registry gate (404) -&gt; type validation (400) -&gt;
     * findByKey -&gt; buildWriteOutcome -&gt; save -&gt; audit insert (BEFORE
     * reload) -&gt; reload trigger. The reload result NEVER causes this
     * method to throw or to alter/roll back the already-persisted save or
     * audit doc - it is folded into the response as a distinct field.
     */
    public AdminConfigWriteResponseDto writeConfig(String keyPath, String rawValue, String actorEmail) {
        ConfigKey<?> registryKey = findKey(keyPath)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Unknown config key: " + keyPath));

        validateValue(registryKey, rawValue);

        ConfigItem existing = configItemRepository.findByKey(registryKey.getKey()).orElse(null);
        LocalDateTime now = LocalDateTime.now();
        String traceId = ThreadContext.get(TRACE_ID_MDC_KEY);

        WriteOutcome outcome = buildWriteOutcome(registryKey, existing, rawValue, actorEmail, now, traceId);

        ConfigItem saved = configItemRepository.save(outcome.rowToSave());
        configAuditRepository.insert(outcome.auditEntry());

        ReloadResultDto reloadResult = configReloadClient.triggerReload();

        return new AdminConfigWriteResponseDto(
                saved.getKey(),
                outcome.auditEntry().getOldValue(),
                saved.getValue(),
                saved.getUpdatedBy(),
                saved.getUpdatedAt(),
                reloadResult);
    }

    /** Manual reload proxy: delegates to the SAME client/signer path as the PUT write. */
    public ReloadResultDto manualReload() {
        return configReloadClient.triggerReload();
    }

    // ---- AC-5: pure Pageable builder + audit query orchestration ----

    /**
     * Pure function (pageOrNull, sizeOrNull) -&gt; PageRequest. page defaults
     * to 0 (negative clamps to 0); size defaults to 20 and is clamped into
     * [1, 100] (0/negative -&gt; 1, &gt;100 -&gt; 100); sort is fixed
     * updatedAt DESC so every caller gets newest-first regardless of filter
     * combination.
     */
    public static Pageable buildAuditPageable(Integer pageOrNull, Integer sizeOrNull) {
        int page = (pageOrNull == null || pageOrNull < 0) ? 0 : pageOrNull;
        int size = (sizeOrNull == null) ? 20 : sizeOrNull;
        if (size < 1) {
            size = 1;
        } else if (size > 100) {
            size = 100;
        }
        return PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt"));
    }

    /**
     * GET /audit orchestration: ONE pure Pageable builder feeds all 4
     * key/actor filter combinations; every finder takes Pageable (no
     * findAll-then-filter); entries are mapped to the 7-field DTO so the
     * Mongo id and raw entity are never returned.
     */
    public Page<ConfigAuditEntryDto> queryAudit(String key, String actor, Integer page, Integer size) {
        Pageable pageable = buildAuditPageable(page, size);
        boolean hasKey = key != null && !key.isBlank();
        boolean hasActor = actor != null && !actor.isBlank();

        Page<ConfigAudit> result;
        if (hasKey && hasActor) {
            result = configAuditRepository.findByKeyAndUpdatedBy(key, actor, pageable);
        } else if (hasKey) {
            result = configAuditRepository.findByKey(key, pageable);
        } else if (hasActor) {
            result = configAuditRepository.findByUpdatedBy(actor, pageable);
        } else {
            result = configAuditRepository.findAll(pageable);
        }
        return result.map(AdminConfigService::toAuditEntryDto);
    }

    private static ConfigAuditEntryDto toAuditEntryDto(ConfigAudit audit) {
        return new ConfigAuditEntryDto(
                audit.getEntityType(),
                audit.getKey(),
                audit.getOldValue(),
                audit.getNewValue(),
                audit.getUpdatedBy(),
                audit.getUpdatedAt(),
                audit.getTraceId());
    }
}
