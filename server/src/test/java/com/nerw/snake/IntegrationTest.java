package com.nerw.snake;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "snake.db.path=target/test-snake.db",
        "snake.arena.tickRateMs=20",
        "snake.arena.respawnDelayMs=100"
})
class IntegrationTest {

    private static final ObjectMapper M = new ObjectMapper();

    @LocalServerPort
    int port;

    @Autowired
    GameLoop gameLoop;

    @Autowired
    Leaderboard leaderboard;

    @Test
    void twoClientsExchangeStateAndPersist() throws Exception {
        Path db = Path.of("target/test-snake.db");
        Files.deleteIfExists(db);
        Files.deleteIfExists(Path.of("target/test-snake.db-journal"));
        leaderboard.init();

        StandardWebSocketClient client = new StandardWebSocketClient();
        URI uri = URI.create("ws://localhost:" + port + "/ws/arena");

        Recorder r1 = new Recorder();
        Recorder r2 = new Recorder();

        WebSocketSession s1 = client.execute(r1, null, uri).get(5, TimeUnit.SECONDS);
        s1.sendMessage(new TextMessage("{\"type\":\"join\",\"nick\":\"alpha\"}"));
        assertTrue(r1.welcomeLatch.await(5, TimeUnit.SECONDS), "alpha welcome");

        WebSocketSession s2 = client.execute(r2, null, uri).get(5, TimeUnit.SECONDS);
        s2.sendMessage(new TextMessage("{\"type\":\"join\",\"nick\":\"beta\"}"));
        assertTrue(r2.welcomeLatch.await(5, TimeUnit.SECONDS), "beta welcome");

        for (int i = 0; i < 50; i++) {
            Thread.sleep(25);
        }

        long stateCount1 = r1.messages.stream().filter(s -> s.contains("\"type\":\"state\"")).count();
        long stateCount2 = r2.messages.stream().filter(s -> s.contains("\"type\":\"state\"")).count();
        assertTrue(stateCount1 >= 5, "alpha got state stream, got " + stateCount1);
        assertTrue(stateCount2 >= 5, "beta got state stream, got " + stateCount2);

        gameLoop.forceEndRound();
        Thread.sleep(200);

        try (Connection c = DriverManager.getConnection("jdbc:sqlite:target/test-snake.db");
             Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT nick FROM player_stats")) {
            int rows = 0;
            boolean alpha = false, beta = false;
            while (rs.next()) {
                rows++;
                String nick = rs.getString(1);
                if ("alpha".equals(nick)) alpha = true;
                if ("beta".equals(nick)) beta = true;
            }
            assertTrue(alpha, "alpha persisted");
            assertTrue(beta, "beta persisted");
            assertTrue(rows >= 2);
        }

        s1.close(CloseStatus.NORMAL);
        s2.close(CloseStatus.NORMAL);
    }

    static class Recorder extends AbstractWebSocketHandler {
        final List<String> messages = new CopyOnWriteArrayList<>();
        final CountDownLatch welcomeLatch = new CountDownLatch(1);

        @Override
        protected void handleTextMessage(WebSocketSession session, TextMessage message) {
            String p = message.getPayload();
            messages.add(p);
            try {
                JsonNode n = M.readTree(p);
                if ("welcome".equals(n.path("type").asText())) {
                    assertNotNull(n.path("playerId").asText());
                    welcomeLatch.countDown();
                }
            } catch (Exception ignored) {}
        }
    }
}
