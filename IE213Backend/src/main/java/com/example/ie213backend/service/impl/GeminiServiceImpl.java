package com.example.ie213backend.service.impl;

import com.example.ie213backend.config.GeminiConfig;
import com.example.ie213backend.service.GeminiService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class GeminiServiceImpl implements GeminiService {
    private final RestTemplate restTemplate;
    private final GeminiConfig geminiConfig;
    private final ObjectMapper objectMapper;

    @Override
    public String generateText(String prompt) {
        try {
            String url = geminiConfig.getApiKey();

            // 2. Tạo JSON body CHUẨN như curl
            String requestJson = """
                {
                    "contents": [
                        {
                            "parts": [
                                {"text": "%s"}
                            ]
                        }
                    ]
                }
                """.formatted(prompt.replace("\"", "\\\""));

            // 3. Gọi API
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    new HttpEntity<>(requestJson, headers),
                    String.class
            );

            // 4. Parse response
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();

        } catch (Exception e) {
            throw new RuntimeException("Lỗi gọi Gemini API: " + e.getMessage(), e);
        }
    }
}