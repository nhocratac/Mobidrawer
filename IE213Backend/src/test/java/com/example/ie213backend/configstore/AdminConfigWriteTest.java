package com.example.ie213backend.configstore;

import com.example.ie213backend.domain.model.ConfigAudit;
import com.example.ie213backend.domain.model.ConfigItem;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure-JVM tests for {@link AdminConfigService}'s validation matrix (AC-1)
 * and write core (AC-2). No Spring context, no Mockito, hand-built POJOs
 * only - findKey/validateValue/buildWriteOutcome are static pure functions.
 */
class AdminConfigWriteTest {

    // ---- AC-1: validation matrix ----

    @Test
    void unknownKeyIsAbsentFromRegistry() {
        Optional<ConfigKey<?>> found = AdminConfigService.findKey("not.a.real.key");
        assertTrue(found.isEmpty());
    }

    @Test
    void intKeyRejectsNonNumericValue() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> AdminConfigService.validateValue(ConfigKeys.BOARD_FREE_MAX_MEMBERS, "abc"));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getKey()));
        assertTrue(ex.getReason().contains("INT"));
    }

    @Test
    void intKeyAcceptsValidValue() {
        assertTrue(true); // documents the accept path below via no-throw assertion
        assertDoesNotThrowType(ConfigKeys.BOARD_FREE_MAX_MEMBERS, " 7 ");
    }

    @Test
    void longKeyAcceptsValueBeyondIntegerRange() {
        String beyondInt = String.valueOf(((long) Integer.MAX_VALUE) + 1000L);
        assertDoesNotThrowType(ConfigKeys.CACHE_DEFAULT_TTL_MS, beyondInt);
    }

    @Test
    void blankValueIsRejectedWithExpectedType() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> AdminConfigService.validateValue(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES, "   "));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES.getKey()));
        assertTrue(ex.getReason().contains("INT"));
    }

    @Test
    void nullValueIsRejected() {
        assertThrows(ResponseStatusException.class,
                () -> AdminConfigService.validateValue(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES, null));
    }

    private static void assertDoesNotThrowType(ConfigKey<?> key, String value) {
        AdminConfigService.validateValue(key, value); // throws on failure - absence of throw is the assertion
    }

    // ---- AC-2: write core ----

    @Test
    void writeOutcomeOnUnseededKeyHasNullOldValueAndCopiesRegistryMetadata() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 16, 12, 0);
        AdminConfigService.WriteOutcome outcome = AdminConfigService.buildWriteOutcome(
                ConfigKeys.BOARD_FREE_MAX_MEMBERS, null, "9", "admin@example.com", now, "trace-123");

        ConfigItem row = outcome.rowToSave();
        assertNull(row.getId());
        assertEquals(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getKey(), row.getKey());
        assertEquals(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getType().name(), row.getType());
        assertEquals(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getCategory(), row.getCategory());
        assertEquals(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getDescription(), row.getDescription());
        assertEquals("9", row.getValue());
        assertEquals("admin@example.com", row.getUpdatedBy());
        assertEquals(now, row.getUpdatedAt());

        ConfigAudit audit = outcome.auditEntry();
        assertEquals("CONFIG", audit.getEntityType());
        assertEquals(ConfigKeys.BOARD_FREE_MAX_MEMBERS.getKey(), audit.getKey());
        assertNull(audit.getOldValue());
        assertEquals("9", audit.getNewValue());
        assertEquals("admin@example.com", audit.getUpdatedBy());
        assertEquals(now, audit.getUpdatedAt());
        assertEquals("trace-123", audit.getTraceId());
    }

    @Test
    void writeOutcomeOnSeededKeyPreservesIdAndCarriesOldValue() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 16, 12, 30);
        ConfigItem existing = new ConfigItem();
        existing.setId("existing-id-1");
        existing.setKey(ConfigKeys.AUTH_OTP_EXPIRY_MINUTES.getKey());
        existing.setValue("5");
        existing.setUpdatedBy("someone-else@example.com");
        existing.setUpdatedAt(now.minusDays(1));

        AdminConfigService.WriteOutcome outcome = AdminConfigService.buildWriteOutcome(
                ConfigKeys.AUTH_OTP_EXPIRY_MINUTES, existing, "10", "admin@example.com", now, null);

        assertEquals("existing-id-1", outcome.rowToSave().getId());
        assertEquals("10", outcome.rowToSave().getValue());
        assertEquals("5", outcome.auditEntry().getOldValue());
        assertEquals("10", outcome.auditEntry().getNewValue());
        assertNull(outcome.auditEntry().getTraceId());

        // existing row is untouched - buildWriteOutcome never mutates its input
        assertEquals("5", existing.getValue());
        assertEquals("someone-else@example.com", existing.getUpdatedBy());
    }

    @Test
    void writeOutcomeTrimsRawValueBeforePersisting() {
        LocalDateTime now = LocalDateTime.of(2026, 7, 16, 13, 0);
        AdminConfigService.WriteOutcome outcome = AdminConfigService.buildWriteOutcome(
                ConfigKeys.COMMENT_SUBCOMMENT_PAGE_SIZE, null, "  4  ", "admin@example.com", now, "t1");

        assertEquals("4", outcome.rowToSave().getValue());
        assertEquals("4", outcome.auditEntry().getNewValue());
        assertFalse(outcome.rowToSave().getValue().contains(" "));
    }
}
