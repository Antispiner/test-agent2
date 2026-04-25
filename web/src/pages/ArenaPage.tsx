import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useArenaSocket } from "../lib/useArenaSocket";
import { useKeyboardInput, useSwipeInput } from "../lib/input";
import {
  drawArena,
  drawConfetti,
  spawnConfetti,
  type ConfettiPiece,
  type RenderState,
} from "../lib/render";
import type { Dir, LeaderEntry, Snake } from "../lib/protocol";
import { arenaWsUrl } from "../lib/wsUrl";

interface Props {
  nick: string;
  onLeave: () => void;
}

const CONFETTI_MS = 1500;

export function ArenaPage({ nick, onLeave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<RenderState>({
    snakes: [],
    apples: [],
    tick: 0,
    dyingSince: new Map(),
  });
  const playerIdRef = useRef<string | null>(null);
  const confettiRef = useRef<ConfettiPiece[]>([]);
  const confettiUntilRef = useRef(0);
  const lastFrameRef = useRef<number>(performance.now());

  const [score, setScore] = useState({ length: 1, kills: 0 });
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  const url = useMemo(() => arenaWsUrl(), []);

  const onMessage = useCallback((msg: import("../lib/protocol").ServerMsg) => {
    if (msg.type === "welcome") {
      playerIdRef.current = msg.playerId;
      stateRef.current.tick = msg.tick;
      return;
    }
    if (msg.type === "state") {
      const prevSnakes = stateRef.current.snakes;
      const prevAlive = new Map(prevSnakes.map((s) => [s.id, s.alive]));
      const dying = stateRef.current.dyingSince;
      for (const s of msg.snakes) {
        if (!s.alive && prevAlive.get(s.id) !== false && !dying.has(s.id)) {
          dying.set(s.id, msg.tick);
        }
        if (s.alive && dying.has(s.id)) dying.delete(s.id);
      }
      stateRef.current = {
        snakes: msg.snakes,
        apples: msg.apples,
        tick: msg.tick,
        dyingSince: dying,
      };
      const me = playerIdRef.current
        ? msg.snakes.find((s: Snake) => s.id === playerIdRef.current)
        : null;
      if (me) setScore({ length: me.segments.length, kills: me.kills });
      return;
    }
    if (msg.type === "round_end") {
      setWinner(msg.winner);
      setLeaderboard(msg.leaderboard);
      const c = canvasRef.current;
      if (c) {
        confettiRef.current = spawnConfetti(c.width, c.height);
        confettiUntilRef.current = performance.now() + CONFETTI_MS;
      }
    }
  }, []);

  const { status, send } = useArenaSocket({ url, nick, onMessage });

  const sendDir = useCallback((d: Dir) => { send({ type: "input", dir: d }); }, [send]);
  useKeyboardInput(sendDir);
  useSwipeInput(containerRef.current, sendDir);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      drawArena(ctx, w, h, stateRef.current);
      if (now < confettiUntilRef.current) {
        drawConfetti(ctx, confettiRef.current, dt, h);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div ref={containerRef} style={styles.root}>
      <canvas ref={canvasRef} style={styles.canvas} aria-label="Snake arena" />

      <div style={styles.scoreOverlay} aria-live="polite">
        <div style={styles.scoreNick}>{nick}</div>
        <div style={styles.scoreLine}>
          <span>Length</span><strong>{score.length}</strong>
        </div>
        <div style={styles.scoreLine}>
          <span>Kills</span><strong>{score.kills}</strong>
        </div>
        <div style={{ ...styles.scoreLine, color: status === "open" ? "#7fe07f" : "#ffb070" }}>
          <span>Link</span><strong>{status}</strong>
        </div>
      </div>

      {leaderboard.length > 0 && (
        <div style={styles.leaderboard} aria-label="Leaderboard">
          <div style={styles.leaderTitle}>
            {winner ? `${winner} wins` : "Round end"}
          </div>
          <ol style={styles.leaderList}>
            {leaderboard.slice(0, 10).map((e, i) => (
              <li key={`${e.nick}-${i}`} style={styles.leaderRow}>
                <span style={styles.leaderRank}>{i + 1}</span>
                <span style={styles.leaderNick}>{e.nick}</span>
                <span style={styles.leaderStats}>
                  {e.kills}k · {e.length}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <button onClick={onLeave} style={styles.leaveBtn} aria-label="Leave arena">
        ← Leave
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    touchAction: "none",
  },
  canvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    display: "block",
  },
  scoreOverlay: {
    position: "absolute",
    top: 16,
    left: 16,
    minWidth: 160,
    padding: "10px 14px",
    background: "rgba(10,10,20,0.55)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    fontSize: 13,
    backdropFilter: "blur(6px)",
  },
  scoreNick: { fontSize: 16, fontWeight: 600, marginBottom: 6 },
  scoreLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    color: "#c0c0d8",
  },
  leaderboard: {
    position: "absolute",
    bottom: 16,
    right: 16,
    minWidth: 220,
    maxWidth: 280,
    padding: "10px 14px",
    background: "rgba(10,10,20,0.6)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    fontSize: 13,
    backdropFilter: "blur(6px)",
  },
  leaderTitle: { fontSize: 14, fontWeight: 600, marginBottom: 6 },
  leaderList: { listStyle: "none", margin: 0, padding: 0 },
  leaderRow: {
    display: "grid",
    gridTemplateColumns: "20px 1fr auto",
    gap: 8,
    padding: "2px 0",
    alignItems: "baseline",
  },
  leaderRank: { color: "#7080a0" },
  leaderNick: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  leaderStats: { color: "#9090b0", fontSize: 12 },
  leaveBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: "8px 12px",
    background: "rgba(10,10,20,0.55)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8,
    color: "#f0f0f8",
    fontSize: 13,
    backdropFilter: "blur(6px)",
  },
};
