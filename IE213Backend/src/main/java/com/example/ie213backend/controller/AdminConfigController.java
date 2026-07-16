package com.example.ie213backend.controller;

import com.example.ie213backend.configstore.AdminConfigService;
import com.example.ie213backend.domain.dto.AdminConfigEntryDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Read-only admin config surface. Contains ZERO auth logic: enforcement of
 * /api/v1/admin/** is entirely SecurityConfig's hasRole("ADMIN") rule. No
 * write mapping exists here - that is Sprint 2.
 */
@RestController
@RequestMapping("${api.prefix}/admin/config")
@RequiredArgsConstructor
public class AdminConfigController {

    private final AdminConfigService adminConfigService;

    @GetMapping
    public List<AdminConfigEntryDto> getConfig() {
        return adminConfigService.getMergedConfig();
    }
}
