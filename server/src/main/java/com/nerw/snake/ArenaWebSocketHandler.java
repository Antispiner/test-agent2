package com.nerw.snake;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nerw.snake.dto.Welcome;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ArenaWebSocketHandler extends TextWebSocketHandler {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToPlayer = new ConcurrentHashMap<>();
    private final Map<String, String> playerToSession = new ConcurrentHashMap<>();

    @Autowired
    private GameLoop gameLoop;

    public Map<String, WebSocketSession> sessions() {
        return sessions;
    }

    public Map<String, String> playerToSession() {
        return playerToSession;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        sessions.put(session.getId(), session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        JsonNode node;
        try {
            node = MAPPER.readTree(message.getPayload());
        } catch (JsonProcessingException e) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("malformed json"));
            return;
        }
        String type = node.path("type").asText("");
        switch (type) {
            case "join" -> handleJoin(session, node);
            case "input" -> handleInput(session, node);
            default -> session.close(new CloseStatus(1003, "unsupported data"));
        }
    }

    private void handleJoin(WebSocketSession session, JsonNode node) throws IOException {
        String nick = node.path("nick").asText("");
        if (nick.isEmpty() || nick.length() > 16) {
            session.close(new CloseStatus(1003, "bad nick"));
            return;
        }
        if (sessionToPlayer.containsKey(session.getId())) return;
        ArenaState.Snake snake = gameLoop.arena().addSnake(nick);
        sessionToPlayer.put(session.getId(), snake.id);
        playerToSession.put(snake.id, session.getId());
        Welcome w = new Welcome(snake.id, gameLoop.arena().tick);
        sendJson(session, w);
    }

    private void handleInput(WebSocketSession session, JsonNode node) {
        String pid = sessionToPlayer.get(session.getId());
        if (pid == null) return;
        ArenaState.Dir d = ArenaState.Dir.parse(node.path("dir").asText(""));
        gameLoop.arena().setInput(pid, d);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
        String pid = sessionToPlayer.remove(session.getId());
        if (pid != null) {
            playerToSession.remove(pid);
            gameLoop.arena().removeSnake(pid);
        }
    }

    public void broadcast(Object message) {
        String payload;
        try {
            payload = MAPPER.writeValueAsString(message);
        } catch (JsonProcessingException e) {
            return;
        }
        TextMessage tm = new TextMessage(payload);
        for (WebSocketSession s : sessions.values()) {
            if (!s.isOpen()) continue;
            try {
                synchronized (s) {
                    s.sendMessage(tm);
                }
            } catch (IOException ignored) {
            }
        }
    }

    public void sendJson(WebSocketSession s, Object message) throws IOException {
        String payload = MAPPER.writeValueAsString(message);
        synchronized (s) {
            s.sendMessage(new TextMessage(payload));
        }
    }
}
