package com.nerw.snake.dto;

import java.util.List;

public class StateMsg {
    public final String type = "state";
    public List<SnakeView> snakes;
    public List<int[]> apples;
    public long tick;

    public StateMsg() {}

    public StateMsg(List<SnakeView> snakes, List<int[]> apples, long tick) {
        this.snakes = snakes;
        this.apples = apples;
        this.tick = tick;
    }

    public static class SnakeView {
        public String id;
        public String nick;
        public List<int[]> segments;
        public boolean alive;
        public String color;
        public int kills;

        public SnakeView() {}

        public SnakeView(String id, String nick, List<int[]> segments, boolean alive, String color, int kills) {
            this.id = id;
            this.nick = nick;
            this.segments = segments;
            this.alive = alive;
            this.color = color;
            this.kills = kills;
        }
    }
}
