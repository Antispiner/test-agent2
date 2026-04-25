# Snake Arena — Web Client

React 19 + Vite 7 + TypeScript, Canvas 2D renderer. WebSocket client for
the multiplayer snake server (`/ws/arena`).

## Stack

- React 19, TypeScript 5.6, Vite 7
- Canvas 2D (no game engine, hand-rolled confetti)
- Strict TS, vitest for unit tests

## Layout

```
web/
├── index.html
├── src/
│   ├── App.tsx              # routing: lobby ↔ arena, ?nick deep-link
│   ├── main.tsx
│   ├── pages/
│   │   ├── LobbyPage.tsx    # nickname entry + Join button
│   │   └── ArenaPage.tsx    # full-window canvas + overlays
│   └── lib/
│       ├── protocol.ts      # wire types (matches api/spec.md)
│       ├── useArenaSocket.ts# WebSocket hook with 3s reconnect
│       ├── input.ts         # keyboard + swipe handlers
│       ├── render.ts        # canvas drawing + confetti
│       └── wsUrl.ts         # ws/wss URL builder
└── vite.config.ts           # dev proxy: /ws → ws://localhost:8080
```

## Commands

```bash
npm install
npm run dev          # http://localhost:5173 (proxies /ws to :8080)
npm run typecheck
npm test
npm run build        # → web/dist/
```

## Routing & deep-links

- `/`            — lobby (nickname + Join)
- `/join?nick=X` — landing page jumps straight to arena (used by QR codes)

## Protocol

See [`api/spec.md`](../api/spec.md). Client sends `join` then `input`;
server emits `welcome`, `state` @ 15Hz, `round_end`.

## Controls

- Desktop: arrow keys or WASD
- Mobile: swipe (≥30px threshold, 4 directions)
