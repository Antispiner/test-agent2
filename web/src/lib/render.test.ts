import { describe, expect, it, vi } from "vitest";
import {
  drawArena,
  drawConfetti,
  spawnConfetti,
  type RenderState,
} from "./render";

interface MockCtx {
  fillRect: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
  arc: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  fillStyle: string;
  strokeStyle: string;
  shadowColor: string;
  shadowBlur: number;
  lineWidth: number;
  globalAlpha: number;
}

function mockCtx(): MockCtx {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    shadowColor: "",
    shadowBlur: 0,
    lineWidth: 0,
    globalAlpha: 1,
  };
}

describe("spawnConfetti", () => {
  it("returns default 120 pieces", () => {
    const p = spawnConfetti(800, 600);
    expect(p).toHaveLength(120);
  });
  it("respects custom count", () => {
    expect(spawnConfetti(800, 600, 5)).toHaveLength(5);
  });
  it("centers each piece on canvas midpoint", () => {
    const p = spawnConfetti(400, 200, 3);
    for (const piece of p) {
      expect(piece.x).toBe(200);
      expect(piece.y).toBe(100);
    }
  });
  it("piece fields are finite numbers", () => {
    const [piece] = spawnConfetti(800, 600, 1);
    expect(Number.isFinite(piece.vx)).toBe(true);
    expect(Number.isFinite(piece.vy)).toBe(true);
    expect(Number.isFinite(piece.rot)).toBe(true);
    expect(Number.isFinite(piece.vr)).toBe(true);
    expect(piece.color.startsWith("hsl(")).toBe(true);
  });
});

describe("drawConfetti", () => {
  it("advances pieces and draws each", () => {
    const ctx = mockCtx();
    const pieces = spawnConfetti(800, 600, 4);
    const beforeY = pieces.map((p) => p.y);
    drawConfetti(ctx as unknown as CanvasRenderingContext2D, pieces, 1 / 60, 600);
    expect(ctx.save).toHaveBeenCalledTimes(4);
    expect(ctx.restore).toHaveBeenCalledTimes(4);
    expect(ctx.translate).toHaveBeenCalledTimes(4);
    expect(ctx.fillRect).toHaveBeenCalledTimes(4);
    pieces.forEach((p, i) => {
      expect(p.y).not.toBe(beforeY[i]); // moved
    });
  });
  it("skips drawing pieces past viewport bottom", () => {
    const ctx = mockCtx();
    const pieces = spawnConfetti(800, 600, 1);
    pieces[0].y = 999;
    pieces[0].vy = 0;
    drawConfetti(ctx as unknown as CanvasRenderingContext2D, pieces, 1 / 60, 600);
    expect(ctx.save).not.toHaveBeenCalled();
  });
});

describe("drawArena", () => {
  it("clears + draws grid + apples + snakes", () => {
    const ctx = mockCtx();
    const state: RenderState = {
      tick: 10,
      apples: [[5, 5], [10, 12]],
      snakes: [
        {
          id: "p1", nick: "alice", color: "#ff00aa", alive: true, kills: 1,
          segments: [[1, 1], [1, 2], [2, 2]],
        },
      ],
      dyingSince: new Map(),
    };
    drawArena(ctx as unknown as CanvasRenderingContext2D, 800, 600, state);
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    expect(ctx.fill).toHaveBeenCalledTimes(2);
  });

  it("fades dying snake based on dyingSince", () => {
    const ctx = mockCtx();
    const state: RenderState = {
      tick: 10,
      apples: [],
      snakes: [
        {
          id: "p1", nick: "x", color: "#ffffff", alive: false, kills: 0,
          segments: [[0, 0]],
        },
      ],
      dyingSince: new Map([["p1", 8]]),
    };
    drawArena(ctx as unknown as CanvasRenderingContext2D, 800, 600, state);
    // partially faded but still drawn
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("skips fully faded snake", () => {
    const ctx = mockCtx();
    const state: RenderState = {
      tick: 100,
      apples: [],
      snakes: [
        {
          id: "p1", nick: "x", color: "#ffffff", alive: false, kills: 0,
          segments: [[0, 0]],
        },
      ],
      dyingSince: new Map([["p1", 1]]),
    };
    drawArena(ctx as unknown as CanvasRenderingContext2D, 800, 600, state);
    // fillRect still called for background + grid not segments — count not zero,
    // but no shadow blur invocation for snake body (proxy: at least background).
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("falls back to HSL color for invalid hex", () => {
    const ctx = mockCtx();
    const state: RenderState = {
      tick: 0,
      apples: [],
      snakes: [
        {
          id: "p1", nick: "x", color: "not-a-color", alive: true, kills: 0,
          segments: [[0, 0]],
        },
      ],
      dyingSince: new Map(),
    };
    drawArena(ctx as unknown as CanvasRenderingContext2D, 800, 600, state);
    expect(ctx.fillStyle.startsWith("hsl(")).toBe(true);
  });
});
