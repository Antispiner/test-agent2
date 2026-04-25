---
id: 0001
title: Snake Arena — core technology choices
status: accepted
date: 2026-04-25
---

# ADR 0001: Snake Arena Core Stack

## Context

Snake Arena is a real-time multiplayer browser game. Players control snakes
on a shared grid, eat apples, avoid collisions, and compete on a leaderboard.
The system must deliver low-latency state updates to multiple clients,
serve a static frontend, and persist match results.

## Decisions

### Spring WebSocket (raw, no STOMP)

**Choice**: Spring's `WebSocketHandler` with raw text frames, no STOMP broker.

**Why**:
- STOMP adds frame parsing, subscriptions, and broker semantics the game
  does not need. Snake Arena has one logical channel per connection: input
  in, state out.
- Raw JSON frames keep client code minimal (a browser `WebSocket` instance,
  no STOMP.js dependency).
- Server-side broadcast is a simple `for (session : sessions) session.sendMessage(...)`.
  No destination routing, no message converter chain.
- Latency: one fewer parsing layer per frame at 15Hz × N players.

**Trade-off**: We hand-roll message dispatch (`switch (type)`). Acceptable
for a fixed protocol of ~5 message types.

### Canvas 2D (no game engine)

**Choice**: Plain HTML5 `<canvas>` with `getContext('2d')`. No Phaser, PixiJS,
or Three.js.

**Why**:
- 40x30 grid of axis-aligned rectangles is the simplest possible render
  target. Engines add abstraction (sprites, scenes, tickers) we would
  immediately bypass.
- Zero build-time dependencies on the frontend; a single `<script>` tag.
- Server is authoritative — client only paints state. No physics, no
  tweening, no input prediction worth an engine.

**Trade-off**: No free dirty-rectangle optimization. At 1200 cells × 15Hz
this is irrelevant.

### SQLite via JDBC (no JPA)

**Choice**: `sqlite-jdbc` driver, plain `PreparedStatement`. No Hibernate,
no Spring Data JPA.

**Why**:
- Schema is one table: `match_results(id, ended_at, winner_nick, kills, length)`.
- JPA's entity lifecycle, dirty-checking, and lazy loading are pure overhead
  here.
- SQLite is file-backed, zero-ops, fits a single-server deployment.
- JDBC keeps startup time low and the dependency graph small.

**Trade-off**: Manual SQL. Acceptable; the schema will not grow beyond
match results and an optional player nickname index.

### 15Hz tick (66ms)

**Choice**: Game loop runs at 15 ticks per second (~66.7ms per tick).

**Why**:
- Snake movement is grid-discrete: one cell per tick. 15Hz feels responsive
  without making the snake un-readably fast (15 cells/sec on a 40-wide
  board ≈ 2.6s end-to-end traversal).
- Network frame rate matches tick rate; ~66ms is well below the
  ~100ms human perception threshold for input lag.
- 15Hz × ~50 bytes/frame × N players is bandwidth-cheap even at N=20.

**Trade-off**: Not suitable for action games requiring sub-50ms response.
Snake Arena is turn-paced; this is a feature, not a limit.

### 40x30 grid

**Choice**: Fixed grid of 40 columns × 30 rows = 1200 cells.

**Why**:
- 4:3 aspect ratio renders cleanly at common canvas sizes (e.g. 800x600,
  20px cells).
- 1200 cells supports up to ~8 players with apples without immediate
  congestion; collision-driven elimination keeps round length bounded.
- Small enough that full state per frame (`snakes` + `apples`) stays
  under ~1 KB JSON, comfortable for 15Hz broadcast.

**Trade-off**: Hard-coded. A configurable grid is a future enhancement;
fixed dimensions simplify v1 testing and replay.

## Consequences

- Frontend is a single static page (HTML + JS + CSS), served by Spring's
  static resource handler.
- Backend is one Spring Boot module: REST for leaderboard, WebSocket for
  gameplay, JDBC for persistence.
- No external broker, no ORM, no game engine — fewer moving parts to
  operate, fewer versions to upgrade.
