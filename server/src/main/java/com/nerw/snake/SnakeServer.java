package com.nerw.snake;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SnakeServer {
    public static void main(String[] args) {
        SpringApplication.run(SnakeServer.class, args);
    }
}
