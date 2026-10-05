package com.example.ie213backend.config;

import com.example.ie213backend.service.element.ElementMigration;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

// Chạy một lần: --spring.profiles.active=migrate-elements [--elements.migrate.since=2026-09-24T10:00:00]
@Component
@Profile("migrate-elements")
@RequiredArgsConstructor
public class ElementMigrationRunner implements CommandLineRunner {
    private final ElementMigration migration;
    private final ApplicationContext context;

    @Value("${elements.migrate.since:}")
    private String since;

    @Override
    public void run(String... args) {
        boolean delta = since != null && !since.isBlank();
        migration.run(delta, delta ? LocalDateTime.parse(since) : null);
        System.exit(SpringApplication.exit(context, () -> 0));
    }
}
