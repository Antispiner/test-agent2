package com.nerw.snake.dto;

import java.util.List;

public class RoundEnd {
    public final String type = "round_end";
    public String winner;
    public List<Entry> leaderboard;

    public RoundEnd() {}

    public RoundEnd(String winner, List<Entry> leaderboard) {
        this.winner = winner;
        this.leaderboard = leaderboard;
    }

    public static class Entry {
        public String nick;
        public int total_kills;
        public int total_apples;
        public int total_wins;

        public Entry() {}

        public Entry(String nick, int total_kills, int total_apples, int total_wins) {
            this.nick = nick;
            this.total_kills = total_kills;
            this.total_apples = total_apples;
            this.total_wins = total_wins;
        }
    }
}
