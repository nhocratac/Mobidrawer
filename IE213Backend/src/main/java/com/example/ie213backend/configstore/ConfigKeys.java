package com.example.ie213backend.configstore;

import java.util.List;

/**
 * Catalog of the config registry. Exactly 5 keys this sprint - no secrets,
 * no 6th key. See docs/superpowers/specs/2026-07-16-config-service-design.md.
 */
public final class ConfigKeys {

    private ConfigKeys() {
    }

    public static final ConfigKey<Integer> BOARD_FREE_MAX_MEMBERS = new ConfigKey<>(
            "board.free.max_members",
            ConfigValueType.INT,
            3,
            "Limits",
            "Maximum number of members allowed on a board for FREE-plan owners"
    );

    public static final ConfigKey<Integer> AUTH_OTP_EXPIRY_MINUTES = new ConfigKey<>(
            "auth.otp.expiry_minutes",
            ConfigValueType.INT,
            5,
            "Timing",
            "OTP / verification code expiry window, in minutes"
    );

    public static final ConfigKey<Integer> PAYMENT_PLAN_DURATION_DAYS = new ConfigKey<>(
            "payment.plan.duration_days",
            ConfigValueType.INT,
            30,
            "Payment",
            "Subscription plan validity after purchase, in days"
    );

    public static final ConfigKey<Long> CACHE_DEFAULT_TTL_MS = new ConfigKey<>(
            "cache.default.ttl_ms",
            ConfigValueType.LONG,
            600000L,
            "Timing",
            "Default cache TTL in milliseconds. NOTE: application.properties "
                    + "(spring.cache.redis.time-to-live) remains authoritative for Spring's "
                    + "auto-configured RedisCacheManager until a later sprint; this key is "
                    + "registry+seed only and is not read by any bean this sprint."
    );

    public static final ConfigKey<Integer> COMMENT_SUBCOMMENT_PAGE_SIZE = new ConfigKey<>(
            "comment.subcomment.page_size",
            ConfigValueType.INT,
            3,
            "Limits",
            "Default page size used when paginating sub-comments (replies)"
    );

    public static final List<ConfigKey<?>> ALL = List.of(
            BOARD_FREE_MAX_MEMBERS,
            AUTH_OTP_EXPIRY_MINUTES,
            PAYMENT_PLAN_DURATION_DAYS,
            CACHE_DEFAULT_TTL_MS,
            COMMENT_SUBCOMMENT_PAGE_SIZE
    );
}
