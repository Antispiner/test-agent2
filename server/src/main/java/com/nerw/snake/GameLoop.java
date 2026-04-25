package com.nerw.snake;

import com.nerw.snake.dto.RoundEnd;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class GameLoop {

    @Value("${snake.arena.width:40}")
    private int width;

    @Value("${snake.arena.height:30}")
    private int height;

    @Value("${snake.arena.maxApples:3}")
    private int maxApples;

    @Value("${snake.arena.respawnDelayMs:5000}")
    private long respawnDelayMs;

    @Value("${snake.arena.tickRateMs:66}")
    private long tickRateMs;

    private ArenaState arena;
    private boolean roundEnded = false;
    private long roundEndedAtMs = 0;
    private Map<String, RoundStats> roundStats = new java.util.HashMap<>();

    @Autowired
    @Lazy
    private ArenaWebSocketHandler handler;

    @Autowired
    private Leaderboard leaderboard;

    @PostConstruct
    public void start() {
        arena = new ArenaState(width, height, maxApples);
    }

    public ArenaState arena() {
        return arena;
    }

    public void setArena(ArenaState a) {
        this.arena = a;
    }

    @Scheduled(fixedRateString = "${snake.arena.tickRateMs:66}")
    public synchronized void tick() {
        if (arena == null) return;

        if (roundEnded) {
            if (System.currentTimeMillis() - roundEndedAtMs >= respawnDelayMs) {
                if (!arena.snakes().isEmpty()) {
                    arena.respawnAll();
                    roundStats.clear();
                    for (ArenaState.Snake s : arena.snakes().values()) {
                        roundStats.put(s.id, new RoundStats(s.nick));
                    }
                }
                roundEnded = false;
            } else {
                if (handler != null) handler.broadcast(arena.snapshot());
                return;
            }
        }

        for (ArenaState.Snake s : arena.snakes().values()) {
            roundStats.computeIfAbsent(s.id, k -> new RoundStats(s.nick));
        }

        ArenaState.TickResult r = arena.step();

        for (Map.Entry<String, String> e : r.killerOf.entrySet()) {
            RoundStats killer = roundStats.get(e.getValue());
            if (killer != null) killer.kills++;
        }
        for (ArenaState.Snake s : arena.snakes().values()) {
            RoundStats rs = roundStats.get(s.id);
            if (rs != null) rs.apples = s.apples;
        }

        if (handler != null) handler.broadcast(arena.snapshot());

        long alive = arena.snakes().values().stream().filter(s -> s.alive).count();
        int total = arena.snakes().size();
        if (total >= 2 && alive <= 1) {
            endRound();
        } else if (total == 1 && alive == 0) {
            endRound();
        }
    }

    public synchronized void endRound() {
        if (roundEnded) return;
        roundEnded = true;
        roundEndedAtMs = System.currentTimeMillis();

        ArenaState.Snake winner = null;
        for (ArenaState.Snake s : arena.snakes().values()) {
            if (s.alive) { winner = s; break; }
        }
        String winnerNick = winner != null ? winner.nick : null;

        List<Leaderboard.PlayerRound> persist = new ArrayList<>();
        for (RoundStats rs : roundStats.values()) {
            persist.add(new Leaderboard.PlayerRound(rs.nick, rs.kills, rs.apples));
        }
        if (!persist.isEmpty()) {
            leaderboard.recordRound(persist, winnerNick);
        }

        List<RoundEnd.Entry> top = leaderboard.top();
        RoundEnd msg = new RoundEnd(winnerNick, top);
        if (handler != null) handler.broadcast(msg);
    }

    public void forceEndRound() {
        endRound();
    }

    private static class RoundStats {
        final String nick;
        int kills = 0;
        int apples = 0;
        RoundStats(String nick) { this.nick = nick; }
    }
}
