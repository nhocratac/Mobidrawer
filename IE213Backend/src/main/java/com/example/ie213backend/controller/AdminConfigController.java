package com.example.ie213backend.controller;

import com.example.ie213backend.configstore.AdminConfigService;
import com.example.ie213backend.domain.dto.AdminConfigEntryDto;
import com.example.ie213backend.domain.dto.AdminConfigWriteRequestDto;
import com.example.ie213backend.domain.dto.AdminConfigWriteResponseDto;
import com.example.ie213backend.domain.dto.ConfigAuditEntryDto;
import com.example.ie213backend.domain.dto.ReloadResultDto;
import com.example.ie213backend.domain.dto.UserDto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Admin config surface: read (Sprint 1) plus write, manual reload proxy, and
 * audit query (Sprint 2 - single-controller rule, all three new mappings
 * live here, splitting into a second controller is forbidden). Contains
 * ZERO auth logic: enforcement of /api/v1/admin/** is entirely
 * SecurityConfig's hasRole("ADMIN") rule (Sprint 1, unchanged this sprint).
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

    @PutMapping("/{key}")
    public AdminConfigWriteResponseDto updateConfig(
            @PathVariable String key,
            @RequestBody AdminConfigWriteRequestDto body,
            @RequestAttribute("user") UserDto userDto) {
        return adminConfigService.writeConfig(key, body.getValue(), userDto.getEmail());
    }

    @PostMapping("/reload")
    public ReloadResultDto reload() {
        return adminConfigService.manualReload();
    }

    @GetMapping("/audit")
    public Page<ConfigAuditEntryDto> getAudit(
            @RequestParam(required = false) String key,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return adminConfigService.queryAudit(key, actor, page, size);
    }
}
