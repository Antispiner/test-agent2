import { describe, expect, it } from "vitest";
import { isServerMsg } from "./protocol";

describe("isServerMsg", () => {
  it("accepts welcome", () => {
    expect(isServerMsg({ type: "welcome", playerId: "x", tick: 0 })).toBe(true);
  });
  it("accepts state", () => {
    expect(
      isServerMsg({ type: "state", snakes: [], apples: [], tick: 1 }),
    ).toBe(true);
  });
  it("accepts round_end", () => {
    expect(
      isServerMsg({ type: "round_end", winner: null, leaderboard: [] }),
    ).toBe(true);
  });
  it("rejects unknown type", () => {
    expect(isServerMsg({ type: "ping" })).toBe(false);
  });
  it("rejects non-objects", () => {
    expect(isServerMsg(null)).toBe(false);
    expect(isServerMsg(42)).toBe(false);
    expect(isServerMsg("hi")).toBe(false);
  });
});
