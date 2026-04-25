import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "node:crypto";

type Dir = "up" | "down" | "left" | "right";
interface Snake {
  id: string;
  nick: string;
  segments: [number, number][];
  alive: boolean;
  color: string;
  kills: number;
  dir: Dir;
  pendingDir: Dir | null;
}

interface Player {
  ws: WebSocket;
  snake: Snake;
}

const GRID_W = 40;
const GRID_H = 30;
const TICK_MS = Math.round(1000 / 15);
const PORT = Number(process.env.MOCK_PORT ?? 8090);

const colors = ["#ff5577", "#55ddff", "#88ff77", "#ffaa55", "#bb88ff"];
const players = new Map<string, Player>();
let apples: [number, number][] = [[20, 15]];
let tick = 0;

const opposite: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const step: Record<Dir, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

function broadcast(msg: object) {
  const data = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p.ws.readyState === WebSocket.OPEN) p.ws.send(data);
  }
}

function snapshot() {
  return {
    type: "state" as const,
    snakes: [...players.values()].map((p) => ({
      id: p.snake.id,
      nick: p.snake.nick,
      segments: p.snake.segments,
      alive: p.snake.alive,
      color: p.snake.color,
      kills: p.snake.kills,
    })),
    apples,
    tick,
  };
}

function spawnSnake(nick: string): Snake {
  const idx = players.size;
  const x = 5 + idx * 8;
  const y = 5 + idx * 5;
  return {
    id: randomUUID(),
    nick,
    segments: [
      [x, y],
      [x - 1, y],
      [x - 2, y],
    ],
    alive: true,
    color: colors[idx % colors.length],
    kills: 0,
    dir: "right",
    pendingDir: null,
  };
}

function gameLoop() {
  tick++;
  for (const p of players.values()) {
    const s = p.snake;
    if (!s.alive) continue;
    if (s.pendingDir && opposite[s.pendingDir] !== s.dir) {
      s.dir = s.pendingDir;
    }
    s.pendingDir = null;
    const [hx, hy] = s.segments[0];
    const [dx, dy] = step[s.dir];
    const nx = (hx + dx + GRID_W) % GRID_W;
    const ny = (hy + dy + GRID_H) % GRID_H;
    s.segments.unshift([nx, ny]);
    const ateIdx = apples.findIndex(([ax, ay]) => ax === nx && ay === ny);
    if (ateIdx >= 0) {
      apples.splice(ateIdx, 1);
      apples.push([
        Math.floor(Math.random() * GRID_W),
        Math.floor(Math.random() * GRID_H),
      ]);
    } else {
      s.segments.pop();
    }
  }
  broadcast(snapshot());
}

const wss = new WebSocketServer({ port: PORT, path: "/ws/arena" });
wss.on("connection", (ws) => {
  let pid: string | null = null;
  ws.on("message", (raw) => {
    let msg: { type?: string; nick?: string; dir?: Dir };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg.type === "join" && typeof msg.nick === "string") {
      const snake = spawnSnake(msg.nick.slice(0, 16));
      pid = snake.id;
      players.set(pid, { ws, snake });
      ws.send(JSON.stringify({ type: "welcome", playerId: pid, tick }));
      broadcast(snapshot());
      return;
    }
    if (msg.type === "input" && pid && msg.dir) {
      const p = players.get(pid);
      if (p && p.snake.alive) p.snake.pendingDir = msg.dir;
    }
  });
  ws.on("close", () => {
    if (pid) players.delete(pid);
    broadcast(snapshot());
  });
});

setInterval(gameLoop, TICK_MS);

process.stdout.write(`mock-server listening on ws://localhost:${PORT}/ws/arena\n`);
