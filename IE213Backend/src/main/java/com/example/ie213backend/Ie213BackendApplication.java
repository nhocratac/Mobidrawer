package com.example.ie213backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class Ie213BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(Ie213BackendApplication.class, args);
    }

}
