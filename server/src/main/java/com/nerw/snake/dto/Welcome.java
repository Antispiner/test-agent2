package com.nerw.snake.dto;

public class Welcome {
    public final String type = "welcome";
    public String playerId;
    public long tick;

    public Welcome() {}

    public Welcome(String playerId, long tick) {
        this.playerId = playerId;
        this.tick = tick;
    }
}
