export const GRID_W = 40;
export const GRID_H = 30;

export type Dir = "up" | "down" | "left" | "right";

export interface JoinMsg { type: "join"; nick: string; }
export interface InputMsg { type: "input"; dir: Dir; }
export type ClientMsg = JoinMsg | InputMsg;

export interface Snake {
  id: string;
  nick: string;
  segments: [number, number][];
  alive: boolean;
  color: string;
  kills: number;
}

export interface WelcomeMsg { type: "welcome"; playerId: string; tick: number; }
export interface StateMsg {
  type: "state";
  snakes: Snake[];
  apples: [number, number][];
  tick: number;
}
export interface LeaderEntry { nick: string; kills: number; length: number; }
export interface RoundEndMsg {
  type: "round_end";
  winner: string | null;
  leaderboard: LeaderEntry[];
}
export type ServerMsg = WelcomeMsg | StateMsg | RoundEndMsg;

export function isServerMsg(v: unknown): v is ServerMsg {
  if (!v || typeof v !== "object") return false;
  const t = (v as { type?: unknown }).type;
  return t === "welcome" || t === "state" || t === "round_end";
}
