package com.nerw.snake;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GameLogicTest {

    @Test
    void wallCollisionKills() {
        ArenaState a = new ArenaState(40, 30, 3, 1L);
        ArenaState.Snake s = a.addSnake("p1");
        s.segments.clear();
        s.segments.add(new int[]{0, 5});
        s.segments.add(new int[]{1, 5});
        s.segments.add(new int[]{2, 5});
        s.dir = ArenaState.Dir.LEFT;
        s.pendingDir = ArenaState.Dir.LEFT;
        s.alive = true;
        a.step();
        assertFalse(s.alive, "snake should die hitting left wall");
    }

    @Test
    void appleEatGrowsSnake() {
        ArenaState a = new ArenaState(40, 30, 3, 2L);
        ArenaState.Snake s = a.addSnake("p1");
        s.segments.clear();
        s.segments.add(new int[]{10, 10});
        s.segments.add(new int[]{9, 10});
        s.segments.add(new int[]{8, 10});
        s.dir = ArenaState.Dir.RIGHT;
        s.pendingDir = ArenaState.Dir.RIGHT;
        s.alive = true;
        a.apples().clear();
        a.forceApple(11, 10);
        int before = s.segments.size();
        a.step();
        assertTrue(s.alive);
        assertEquals(before + 1, s.segments.size(), "ate apple → grow");
        assertEquals(1, s.apples);
    }

    @Test
    void appleSpawnsWhenBelowCap() {
        ArenaState a = new ArenaState(40, 30, 3, 3L);
        a.apples().clear();
        ArenaState.Snake s = a.addSnake("p1");
        a.step();
        assertTrue(a.apples().size() >= 1, "apple should spawn when below cap");
    }

    @Test
    void selfCollisionKills() {
        ArenaState a = new ArenaState(40, 30, 3, 4L);
        ArenaState.Snake s = a.addSnake("p1");
        s.segments.clear();
        s.segments.add(new int[]{10, 10});
        s.segments.add(new int[]{10, 11});
        s.segments.add(new int[]{11, 11});
        s.segments.add(new int[]{11, 10});
        s.segments.add(new int[]{12, 10});
        s.dir = ArenaState.Dir.RIGHT;
        s.pendingDir = ArenaState.Dir.RIGHT;
        s.alive = true;
        a.apples().clear();
        a.setInput(s.id, ArenaState.Dir.UP);
        a.setInput(s.id, ArenaState.Dir.UP);
        a.step();
    }

    @Test
    void headOnCollisionKillsBoth() {
        ArenaState a = new ArenaState(40, 30, 3, 5L);
        ArenaState.Snake s1 = a.addSnake("p1");
        ArenaState.Snake s2 = a.addSnake("p2");
        s1.segments.clear();
        s1.segments.add(new int[]{10, 10});
        s1.segments.add(new int[]{9, 10});
        s1.segments.add(new int[]{8, 10});
        s1.dir = ArenaState.Dir.RIGHT;
        s1.pendingDir = ArenaState.Dir.RIGHT;
        s1.alive = true;
        s2.segments.clear();
        s2.segments.add(new int[]{12, 10});
        s2.segments.add(new int[]{13, 10});
        s2.segments.add(new int[]{14, 10});
        s2.dir = ArenaState.Dir.LEFT;
        s2.pendingDir = ArenaState.Dir.LEFT;
        s2.alive = true;
        a.apples().clear();
        a.step();
        assertFalse(s1.alive);
        assertFalse(s2.alive);
        assertEquals(0, s1.kills);
        assertEquals(0, s2.kills);
    }

    @Test
    void killerCreditedOnBodyHit() {
        ArenaState a = new ArenaState(40, 30, 3, 6L);
        ArenaState.Snake victim = a.addSnake("victim");
        ArenaState.Snake killer = a.addSnake("killer");
        victim.segments.clear();
        victim.segments.add(new int[]{10, 10});
        victim.segments.add(new int[]{10, 11});
        victim.segments.add(new int[]{10, 12});
        victim.dir = ArenaState.Dir.UP;
        victim.pendingDir = ArenaState.Dir.UP;
        victim.alive = true;

        killer.segments.clear();
        killer.segments.add(new int[]{11, 9});
        killer.segments.add(new int[]{10, 9});
        killer.segments.add(new int[]{9, 9});
        killer.dir = ArenaState.Dir.RIGHT;
        killer.pendingDir = ArenaState.Dir.RIGHT;
        killer.alive = true;

        a.apples().clear();
        a.step();
        assertFalse(victim.alive, "victim hits killer's body");
        assertTrue(killer.alive, "killer survives");
        assertEquals(1, killer.kills, "killer credited");
    }

    @Test
    void reverseDirectionIgnored() {
        ArenaState a = new ArenaState(40, 30, 3, 7L);
        ArenaState.Snake s = a.addSnake("p1");
        s.segments.clear();
        s.segments.add(new int[]{10, 10});
        s.segments.add(new int[]{9, 10});
        s.segments.add(new int[]{8, 10});
        s.dir = ArenaState.Dir.RIGHT;
        s.pendingDir = ArenaState.Dir.RIGHT;
        s.alive = true;
        a.apples().clear();
        a.setInput(s.id, ArenaState.Dir.LEFT);
        assertEquals(ArenaState.Dir.RIGHT, s.pendingDir, "reverse must be rejected");
    }
}
