package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.dto.AdminConfigEntryDto;
import com.example.ie213backend.domain.model.ConfigItem;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure-JVM tests for {@link AdminConfigService#merge(List)} using hand-built
 * {@link ConfigItem} POJOs - no Spring context, no Mockito, no repository
 * double (AC-6). Also carries the AC-5 no-secrets exclusion test.
 */
class AdminConfigMergeTest {

    private static ConfigItem row(String key, String value, String updatedBy, LocalDateTime updatedAt) {
        ConfigItem item = new ConfigItem();
        item.setKey(key);
        item.setValue(value);
        item.setUpdatedBy(updatedBy);
        item.setUpdatedAt(updatedAt);
        return item;
    }

    @Test
    void allFiveSeededHappyPath() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 16, 10, 0);
        List<ConfigItem> rows = List.of(
                row(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getKey(), "5", "alice", now),
                row(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES.getKey(), "10", "alice", now),
                row(ConfigKeys.PAYMENT_PLAN_DURATION_DAYS.getKey(), "60", "alice", now),
                row(ConfigKeys.CACHE_DEFAULT_TTL_MS.getKey(), "900000", "alice", now),
                row(ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE.getKey(), "7", "alice", now)
        );

        List<AdminConfigEntryDto> result = AdminConfigService.merge(rows);

        assertEquals(5, result.size());
        AdminConfigEntryDto first = result.get(0);
        assertEquals(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getKey(), first.getKey());
        assertEquals(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getCategory(), first.getCategory());
        assertEquals("INT", first.getType());
        assertEquals(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getDescription(), first.getDescription());
        assertEquals("5", first.getValue());
        assertEquals("alice", first.getUpdatedBy());
        assertEquals(now, first.getUpdatedAt());
        assertTrue(first.isSeeded());
    }

    @Test
    void oneRegistryKeyMissingYieldsUnseededNulls() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 16, 10, 0);
        List<ConfigItem> rows = new ArrayList<>(List.of(
                row(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getKey(), "5", "alice", now),
                row(ConfigKeys.PAYMENT_PLAN_DURATION_DAYS.getKey(), "60", "alice", now),
                row(ConfigKeys.CACHE_DEFAULT_TTL_MS.getKey(), "900000", "alice", now),
                row(ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE.getKey(), "7", "alice", now)
        ));
        // AUTH_OTP_EXPIRY_MINUTES deliberately absent.

        List<AdminConfigEntryDto> result = AdminConfigService.merge(rows);

        assertEquals(5, result.size());
        AdminConfigEntryDto missing = result.stream()
                .filter(e -> e.getKey().equals(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES.getKey()))
                .findFirst()
                .orElseThrow();
        assertFalse(missing.isSeeded());
        assertNull(missing.getValue());
        assertNull(missing.getUpdatedBy());
        assertNull(missing.getUpdatedAt());
    }

    @Test
    void nonRegistrySecretBearingRowIsExcluded() {
        List<ConfigItem> rows = List.of(
                row("jwt.secret", "super-secret-value", "root", LocalDateTime.now()),
                row("evil.key", "hax", "root", LocalDateTime.now())
        );

        List<AdminConfigEntryDto> result = AdminConfigService.merge(rows);

        assertEquals(ConfigKeys.ALL.size(), result.size());
        assertTrue(result.stream().noneMatch(e -> "jwt.secret".equals(e.getKey())));
        assertTrue(result.stream().noneMatch(e -> "evil.key".equals(e.getKey())));
        assertTrue(result.stream().noneMatch(e -> "super-secret-value".equals(e.getValue())));
        assertTrue(result.stream().noneMatch(e -> "hax".equals(e.getValue())));
    }

    @Test
    void outputOrderMatchesRegistryOrder() {
        List<AdminConfigEntryDto> result = AdminConfigService.merge(List.of());

        List<String> expectedOrder = ConfigKeys.ALL.stream().map(ConfigKey::getKey).toList();
        List<String> actualOrder = result.stream().map(AdminConfigEntryDto::getKey).toList();
        assertEquals(expectedOrder, actualOrder);
    }

    @Test
    void emptyRowListYieldsAllUnseeded() {
        List<AdminConfigEntryDto> result = AdminConfigService.merge(List.of());

        assertEquals(5, result.size());
        assertTrue(result.stream().allMatch(e -> !e.isSeeded()));
        assertTrue(result.stream().allMatch(e -> e.getValue() == null));
    }
}
