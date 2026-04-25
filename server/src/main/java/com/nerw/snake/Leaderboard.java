package com.nerw.snake;

import com.nerw.snake.dto.RoundEnd;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

@Component
public class Leaderboard {

    @Value("${snake.db.path:snake.db}")
    private String dbPath;

    private String url;

    @PostConstruct
    public void init() {
        url = "jdbc:sqlite:" + dbPath;
        try (Connection c = DriverManager.getConnection(url); Statement s = c.createStatement()) {
            s.execute("""
                CREATE TABLE IF NOT EXISTS player_stats (
                    nick TEXT PRIMARY KEY,
                    total_kills INTEGER NOT NULL DEFAULT 0,
                    total_apples INTEGER NOT NULL DEFAULT 0,
                    total_wins INTEGER NOT NULL DEFAULT 0
                )
            """);
        } catch (SQLException e) {
            throw new RuntimeException("Failed to init leaderboard DB at " + url, e);
        }
    }

    public Leaderboard() {}

    public Leaderboard(String dbPath) {
        this.dbPath = dbPath;
        init();
    }

    public synchronized void recordRound(List<PlayerRound> rounds, String winnerNick) {
        try (Connection c = DriverManager.getConnection(url)) {
            c.setAutoCommit(false);
            String upsert = """
                INSERT INTO player_stats(nick, total_kills, total_apples, total_wins)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(nick) DO UPDATE SET
                    total_kills = total_kills + excluded.total_kills,
                    total_apples = total_apples + excluded.total_apples,
                    total_wins = total_wins + excluded.total_wins
                """;
            try (PreparedStatement ps = c.prepareStatement(upsert)) {
                for (PlayerRound r : rounds) {
                    ps.setString(1, r.nick);
                    ps.setInt(2, r.kills);
                    ps.setInt(3, r.apples);
                    ps.setInt(4, r.nick.equals(winnerNick) ? 1 : 0);
                    ps.addBatch();
                }
                ps.executeBatch();
            }
            c.commit();
        } catch (SQLException e) {
            throw new RuntimeException("Failed to write round", e);
        }
    }

    public List<RoundEnd.Entry> top() {
        List<RoundEnd.Entry> out = new ArrayList<>();
        String q = "SELECT nick, total_kills, total_apples, total_wins FROM player_stats " +
                "ORDER BY total_wins DESC, total_kills DESC, total_apples DESC LIMIT 50";
        try (Connection c = DriverManager.getConnection(url);
             PreparedStatement ps = c.prepareStatement(q);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                out.add(new RoundEnd.Entry(
                        rs.getString("nick"),
                        rs.getInt("total_kills"),
                        rs.getInt("total_apples"),
                        rs.getInt("total_wins")));
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to read leaderboard", e);
        }
        return out;
    }

    public record PlayerRound(String nick, int kills, int apples) {}
}
