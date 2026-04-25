import { GRID_H, GRID_W, type Snake } from "./protocol";

export interface RenderState {
  snakes: Snake[];
  apples: [number, number][];
  tick: number;
  /** Map of snakeId → death tick (for fade-out). */
  dyingSince: Map<string, number>;
}

const FADE_TICKS = 6; // 15Hz × 0.4s

function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function snakeColor(s: Snake): string {
  if (s.color && /^#[0-9a-fA-F]{6}$/.test(s.color)) return s.color;
  return `hsl(${hueFor(s.id)} 80% 55%)`;
}

export function drawArena(ctx: CanvasRenderingContext2D, w: number, h: number, st: RenderState) {
  const cell = Math.floor(Math.min(w / GRID_W, h / GRID_H));
  const gridW = cell * GRID_W;
  const gridH = cell * GRID_H;
  const ox = Math.floor((w - gridW) / 2);
  const oy = Math.floor((h - gridH) / 2);

  ctx.fillStyle = "#0a0a14";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#15152a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= GRID_W; x++) {
    ctx.moveTo(ox + x * cell + 0.5, oy);
    ctx.lineTo(ox + x * cell + 0.5, oy + gridH);
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.moveTo(ox, oy + y * cell + 0.5);
    ctx.lineTo(ox + gridW, oy + y * cell + 0.5);
  }
  ctx.stroke();

  drawApples(ctx, st.apples, ox, oy, cell, st.tick);
  drawSnakes(ctx, st, ox, oy, cell);
}

function drawApples(
  ctx: CanvasRenderingContext2D,
  apples: [number, number][],
  ox: number,
  oy: number,
  cell: number,
  tick: number,
) {
  const pulse = 0.85 + Math.sin(tick * 0.25) * 0.15;
  const r = (cell / 2 - 1) * pulse;
  ctx.fillStyle = "#ff3344";
  ctx.shadowColor = "#ff3344";
  ctx.shadowBlur = cell * 0.6;
  for (const [x, y] of apples) {
    const cx = ox + x * cell + cell / 2;
    const cy = oy + y * cell + cell / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawSnakes(
  ctx: CanvasRenderingContext2D,
  st: RenderState,
  ox: number,
  oy: number,
  cell: number,
) {
  for (const s of st.snakes) {
    let alpha = 1;
    if (!s.alive) {
      const since = st.dyingSince.get(s.id);
      if (since !== undefined) {
        const elapsed = st.tick - since;
        alpha = Math.max(0, 1 - elapsed / FADE_TICKS);
        if (alpha <= 0) continue;
      } else {
        alpha = 0.4;
      }
    }
    const color = snakeColor(s);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = cell * 0.7;
    for (const [x, y] of s.segments) {
      ctx.fillRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

export interface ConfettiPiece {
  x: number; y: number; vx: number; vy: number; rot: number; vr: number; color: string;
}

export function spawnConfetti(w: number, h: number, count = 120): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    pieces.push({
      x: w / 2,
      y: h / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.9) * 14,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.4,
      color: `hsl(${Math.random() * 360} 90% 60%)`,
    });
  }
  return pieces;
}

export function drawConfetti(
  ctx: CanvasRenderingContext2D,
  pieces: ConfettiPiece[],
  dt: number,
  h: number,
) {
  const g = 0.6;
  for (const p of pieces) {
    p.vy += g * dt * 60;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.rot += p.vr * dt * 60;
    if (p.y > h + 20) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-4, -2, 8, 4);
    ctx.restore();
  }
}
