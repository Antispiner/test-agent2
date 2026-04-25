import { describe, expect, it, vi, afterEach } from "vitest";
import { arenaWsUrl } from "./wsUrl";

describe("arenaWsUrl", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("uses ws on http", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "http:", host: "example.com:8080" },
      writable: true,
    });
    expect(arenaWsUrl()).toBe("ws://example.com:8080/ws/arena");
  });

  it("uses wss on https", () => {
    Object.defineProperty(window, "location", {
      value: { protocol: "https:", host: "secure.example.com" },
      writable: true,
    });
    expect(arenaWsUrl()).toBe("wss://secure.example.com/ws/arena");
  });
});
