package com.example.ie213backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(path = "${api.prefix}/check-env")
@RequiredArgsConstructor
public class EnvController {
    @Value("${app.environment}")
    private String activeProfile;

    @GetMapping
    public String getProfile() {
        return "Current profile: " + activeProfile;
    }
}
