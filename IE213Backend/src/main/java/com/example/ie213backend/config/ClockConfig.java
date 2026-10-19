package com.example.ie213backend.config;

import com.example.ie213backend.service.payment.OrderLedger;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class ClockConfig {
    @Bean
    public Clock clock() { return Clock.system(OrderLedger.VN); }
}
