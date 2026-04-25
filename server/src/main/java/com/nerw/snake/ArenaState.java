package com.nerw.snake;

import com.nerw.snake.dto.StateMsg;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class ArenaState {

    public enum Dir {
        UP(0, -1), DOWN(0, 1), LEFT(-1, 0), RIGHT(1, 0);
        public final int dx, dy;
        Dir(int dx, int dy) { this.dx = dx; this.dy = dy; }
        public boolean opposite(Dir other) {
            return this.dx == -other.dx && this.dy == -other.dy;
        }
        public static Dir parse(String s) {
            if (s == null) return null;
            return switch (s.toLowerCase()) {
                case "up" -> UP;
                case "down" -> DOWN;
                case "left" -> LEFT;
                case "right" -> RIGHT;
                default -> null;
            };
        }
    }

    public static class Snake {
        public final String id;
        public String nick;
        public final LinkedList<int[]> segments = new LinkedList<>();
        public Dir dir;
        public Dir pendingDir;
        public boolean alive = true;
        public int kills = 0;
        public int apples = 0;
        public String color;
        public long deadAtTick = -1;

        public Snake(String id, String nick, String color) {
            this.id = id;
            this.nick = nick;
            this.color = color;
        }

        public int[] head() {
            return segments.peekFirst();
        }
    }

    public final int width;
    public final int height;
    public final int maxApples;
    public long tick = 0;

    private final Map<String, Snake> snakes = new ConcurrentHashMap<>();
    private final List<int[]> apples = Collections.synchronizedList(new ArrayList<>());
    private final Random rng;

    public ArenaState(int width, int height, int maxApples, long seed) {
        this.width = width;
        this.height = height;
        this.maxApples = maxApples;
        this.rng = new Random(seed);
    }

    public ArenaState(int width, int height, int maxApples) {
        this(width, height, maxApples, System.nanoTime());
    }

    public Snake addSnake(String nick) {
        String id = UUID.randomUUID().toString();
        String color = randomColor();
        Snake s = new Snake(id, nick, color);
        spawn(s);
        snakes.put(id, s);
        return s;
    }

    public Snake getSnake(String id) {
        return snakes.get(id);
    }

    public Map<String, Snake> snakes() {
        return snakes;
    }

    public List<int[]> apples() {
        return apples;
    }

    public void removeSnake(String id) {
        snakes.remove(id);
    }

    public void setInput(String id, Dir dir) {
        Snake s = snakes.get(id);
        if (s == null || !s.alive || dir == null) return;
        if (s.dir != null && dir.opposite(s.dir) && s.segments.size() > 1) return;
        s.pendingDir = dir;
    }

    public void respawnAll() {
        apples.clear();
        for (Snake s : snakes.values()) {
            s.segments.clear();
            s.alive = true;
            s.kills = 0;
            s.apples = 0;
            s.deadAtTick = -1;
            s.dir = null;
            s.pendingDir = null;
            spawn(s);
        }
    }

    private void spawn(Snake s) {
        Set<String> occupied = occupiedCells();
        int attempts = 0;
        while (attempts++ < 1000) {
            int x = 3 + rng.nextInt(Math.max(1, width - 6));
            int y = 3 + rng.nextInt(Math.max(1, height - 6));
            Dir d = Dir.values()[rng.nextInt(4)];
            int[] h = {x, y};
            int[] m = {x - d.dx, y - d.dy};
            int[] t = {x - 2 * d.dx, y - 2 * d.dy};
            if (!inBounds(m) || !inBounds(t)) continue;
            if (occupied.contains(key(h)) || occupied.contains(key(m)) || occupied.contains(key(t))) continue;
            s.segments.clear();
            s.segments.add(h);
            s.segments.add(m);
            s.segments.add(t);
            s.dir = d;
            s.pendingDir = d;
            s.alive = true;
            return;
        }
        s.segments.clear();
        s.segments.add(new int[]{0, 0});
        s.segments.add(new int[]{0, 1});
        s.segments.add(new int[]{0, 2});
        s.dir = Dir.UP;
        s.pendingDir = Dir.UP;
    }

    public boolean inBounds(int[] c) {
        return c[0] >= 0 && c[0] < width && c[1] >= 0 && c[1] < height;
    }

    private Set<String> occupiedCells() {
        Set<String> s = new HashSet<>();
        for (Snake snake : snakes.values()) {
            for (int[] seg : snake.segments) s.add(key(seg));
        }
        for (int[] a : apples) s.add(key(a));
        return s;
    }

    public static String key(int[] c) {
        return c[0] + "," + c[1];
    }

    private String randomColor() {
        String[] palette = {"#e74c3c", "#3498db", "#2ecc71", "#f1c40f", "#9b59b6", "#1abc9c", "#e67e22", "#ecf0f1"};
        return palette[rng.nextInt(palette.length)];
    }

    /** Advances one tick. Returns list of (killer, victim) pairs (killer may be null for wall/self). */
    public TickResult step() {
        tick++;

        for (Snake s : snakes.values()) {
            if (!s.alive) continue;
            if (s.pendingDir != null) {
                if (s.dir == null || !s.pendingDir.opposite(s.dir) || s.segments.size() == 1) {
                    s.dir = s.pendingDir;
                }
            }
        }

        Map<String, int[]> newHeads = new HashMap<>();
        for (Snake s : snakes.values()) {
            if (!s.alive) continue;
            int[] h = s.head();
            int[] nh = {h[0] + s.dir.dx, h[1] + s.dir.dy};
            newHeads.put(s.id, nh);
        }

        Set<String> bodyCells = new HashSet<>();
        for (Snake s : snakes.values()) {
            if (!s.alive) continue;
            int[] tail = s.segments.peekLast();
            int n = s.segments.size();
            int i = 0;
            for (int[] seg : s.segments) {
                if (i < n - 1) bodyCells.add(key(seg));
                i++;
            }
            if (s.segments.size() == 1) bodyCells.add(key(tail));
        }

        Map<String, List<String>> headCellOccupants = new HashMap<>();
        for (Map.Entry<String, int[]> e : newHeads.entrySet()) {
            headCellOccupants.computeIfAbsent(key(e.getValue()), k -> new ArrayList<>()).add(e.getKey());
        }

        List<int[]> deaths = new ArrayList<>();
        Set<String> doomed = new HashSet<>();
        Map<String, String> killerOf = new HashMap<>();

        for (Map.Entry<String, int[]> e : newHeads.entrySet()) {
            String id = e.getKey();
            int[] nh = e.getValue();
            if (!inBounds(nh)) {
                doomed.add(id);
                continue;
            }
            List<String> here = headCellOccupants.get(key(nh));
            if (here != null && here.size() > 1) {
                doomed.add(id);
                continue;
            }
            for (Snake other : snakes.values()) {
                if (!other.alive) continue;
                int[] otherHead = newHeads.get(other.id);
                int n = other.segments.size();
                int i = 0;
                for (int[] seg : other.segments) {
                    boolean isOldHead = (i == 0);
                    boolean isOldTail = (i == n - 1);
                    if (isOldHead && other.id.equals(id)) { i++; continue; }
                    if (isOldTail && !other.id.equals(id) && other.alive) {
                        boolean otherEats = otherHead != null && willEatApple(otherHead);
                        if (!otherEats) { i++; continue; }
                    }
                    if (isOldTail && other.id.equals(id)) {
                        boolean selfEats = willEatApple(nh);
                        if (!selfEats) { i++; continue; }
                    }
                    if (seg[0] == nh[0] && seg[1] == nh[1]) {
                        doomed.add(id);
                        if (!other.id.equals(id)) {
                            killerOf.put(id, other.id);
                        }
                        break;
                    }
                    i++;
                }
            }
        }

        Map<String, Boolean> ate = new HashMap<>();
        for (Map.Entry<String, int[]> e : newHeads.entrySet()) {
            ate.put(e.getKey(), willEatApple(e.getValue()));
        }

        for (Snake s : snakes.values()) {
            if (!s.alive) continue;
            if (doomed.contains(s.id)) continue;
            int[] nh = newHeads.get(s.id);
            s.segments.addFirst(nh);
            if (Boolean.TRUE.equals(ate.get(s.id))) {
                removeApple(nh);
                s.apples++;
            } else {
                s.segments.removeLast();
            }
        }

        for (String victimId : doomed) {
            Snake victim = snakes.get(victimId);
            if (victim == null || !victim.alive) continue;
            victim.alive = false;
            victim.deadAtTick = tick;
            String killerId = killerOf.get(victimId);
            if (killerId != null && !doomed.contains(killerId)) {
                Snake killer = snakes.get(killerId);
                if (killer != null) killer.kills++;
            }
            deaths.add(new int[]{victimId.hashCode(), killerId == null ? 0 : killerId.hashCode()});
        }

        int activeApples = apples.size();
        if (activeApples < maxApples) {
            spawnApple();
        }

        TickResult r = new TickResult();
        r.deaths = deaths.size();
        r.aliveCount = (int) snakes.values().stream().filter(s -> s.alive).count();
        r.killerOf = killerOf;
        r.doomed = doomed;
        return r;
    }

    private boolean willEatApple(int[] cell) {
        for (int[] a : apples) if (a[0] == cell[0] && a[1] == cell[1]) return true;
        return false;
    }

    private void removeApple(int[] cell) {
        apples.removeIf(a -> a[0] == cell[0] && a[1] == cell[1]);
    }

    public void spawnApple() {
        Set<String> occupied = occupiedCells();
        int attempts = 0;
        while (attempts++ < 1000) {
            int x = rng.nextInt(width);
            int y = rng.nextInt(height);
            int[] c = {x, y};
            if (!occupied.contains(key(c))) {
                apples.add(c);
                return;
            }
        }
    }

    public void forceApple(int x, int y) {
        apples.add(new int[]{x, y});
    }

    public StateMsg snapshot() {
        List<StateMsg.SnakeView> views = new ArrayList<>();
        for (Snake s : snakes.values()) {
            List<int[]> segs = new ArrayList<>(s.segments);
            views.add(new StateMsg.SnakeView(s.id, s.nick, segs, s.alive, s.color, s.kills));
        }
        List<int[]> appleCopy = new ArrayList<>(apples);
        return new StateMsg(views, appleCopy, tick);
    }

    public static class TickResult {
        public int deaths;
        public int aliveCount;
        public Map<String, String> killerOf;
        public Set<String> doomed;
    }
}
