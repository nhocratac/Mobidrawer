package com.example.ie213backend.configstore;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Pure-JVM tests for {@link AdminConfigService#buildAuditPageable(Integer,
 * Integer)} (AC-5): defaults, clamps, and the fixed updatedAt DESC sort. No
 * Spring context (PageRequest/Pageable are plain construction, no
 * repository).
 */
class AdminAuditQueryTest {

    @Test
    void defaultsToPageZeroSizeTwentyWhenBothNull() {
        Pageable pageable = AdminConfigService.buildAuditPageable(null, null);
        assertEquals(0, pageable.getPageNumber());
        assertEquals(20, pageable.getPageSize());
    }

    @Test
    void sizeAboveHundredClampsToHundred() {
        Pageable pageable = AdminConfigService.buildAuditPageable(0, 500);
        assertEquals(100, pageable.getPageSize());
    }

    @Test
    void sizeZeroClampsToOne() {
        Pageable pageable = AdminConfigService.buildAuditPageable(0, 0);
        assertEquals(1, pageable.getPageSize());
    }

    @Test
    void negativeSizeClampsToOne() {
        Pageable pageable = AdminConfigService.buildAuditPageable(0, -5);
        assertEquals(1, pageable.getPageSize());
    }

    @Test
    void negativePageClampsToZero() {
        Pageable pageable = AdminConfigService.buildAuditPageable(-3, 20);
        assertEquals(0, pageable.getPageNumber());
    }

    @Test
    void sortIsUpdatedAtDescending() {
        Pageable pageable = AdminConfigService.buildAuditPageable(null, null);
        Sort.Order order = pageable.getSort().getOrderFor("updatedAt");
        assertTrue(order != null);
        assertEquals(Sort.Direction.DESC, order.getDirection());
    }

    @Test
    void inRangePageAndSizePassThroughUnchanged() {
        Pageable pageable = AdminConfigService.buildAuditPageable(3, 50);
        assertEquals(3, pageable.getPageNumber());
        assertEquals(50, pageable.getPageSize());
    }
}
