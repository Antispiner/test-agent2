import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { useEffect } from "react";
import { useArenaSocket } from "./useArenaSocket";
import type { ServerMsg } from "./protocol";

type Listener = ((ev: { data: string }) => void) | null;

class FakeWS {
  static OPEN = 1;
  static instances: FakeWS[] = [];
  url: string;
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: Listener = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  });
  constructor(url: string) {
    this.url = url;
    FakeWS.instances.push(this);
  }
  triggerOpen() {
    this.readyState = FakeWS.OPEN;
    if (this.onopen) this.onopen();
  }
  triggerMessage(data: unknown) {
    if (this.onmessage) this.onmessage({ data: JSON.stringify(data) });
  }
  triggerRawMessage(raw: string) {
    if (this.onmessage) this.onmessage({ data: raw });
  }
  triggerClose() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }
  triggerError() {
    if (this.onerror) this.onerror();
  }
}

interface HarnessRef {
  status: string;
  send: ReturnType<typeof useArenaSocket>["send"];
}

function Harness({
  url,
  nick,
  onMessage,
  ref,
}: {
  url: string;
  nick: string | null;
  onMessage: (m: ServerMsg) => void;
  ref: { current: HarnessRef | null };
}) {
  const r = useArenaSocket({ url, nick, onMessage });
  useEffect(() => { ref.current = r; });
  return null;
}

beforeEach(() => {
  FakeWS.instances = [];
  vi.stubGlobal("WebSocket", FakeWS as unknown as typeof WebSocket);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useArenaSocket", () => {
  it("does not connect when nick is null", () => {
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    render(<Harness url="ws://x/ws" nick={null} onMessage={onMessage} ref={ref} />);
    expect(FakeWS.instances).toHaveLength(0);
    expect(ref.current?.status).toBe("idle");
  });

  it("connects, sends join, transitions to open", () => {
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    render(<Harness url="ws://x/ws" nick="alice" onMessage={onMessage} ref={ref} />);
    const ws = FakeWS.instances[0];
    expect(ws.url).toBe("ws://x/ws");
    act(() => { ws.triggerOpen(); });
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: "join", nick: "alice" }));
    expect(ref.current?.status).toBe("open");
  });

  it("dispatches valid server messages", () => {
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    render(<Harness url="ws://x/ws" nick="alice" onMessage={onMessage} ref={ref} />);
    const ws = FakeWS.instances[0];
    act(() => { ws.triggerOpen(); });
    act(() => { ws.triggerMessage({ type: "welcome", playerId: "p1", tick: 0 }); });
    expect(onMessage).toHaveBeenCalledWith({ type: "welcome", playerId: "p1", tick: 0 });
  });

  it("ignores malformed JSON", () => {
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    render(<Harness url="ws://x/ws" nick="alice" onMessage={onMessage} ref={ref} />);
    const ws = FakeWS.instances[0];
    act(() => { ws.triggerOpen(); });
    act(() => { ws.triggerRawMessage("{not json"); });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("ignores unknown message types", () => {
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    render(<Harness url="ws://x/ws" nick="alice" onMessage={onMessage} ref={ref} />);
    const ws = FakeWS.instances[0];
    act(() => { ws.triggerOpen(); });
    act(() => { ws.triggerMessage({ type: "bogus" }); });
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("send returns false before open and true once open", () => {
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    render(<Harness url="ws://x/ws" nick="alice" onMessage={onMessage} ref={ref} />);
    expect(ref.current?.send({ type: "input", dir: "up" })).toBe(false);
    const ws = FakeWS.instances[0];
    act(() => { ws.triggerOpen(); });
    expect(ref.current?.send({ type: "input", dir: "down" })).toBe(true);
    expect(ws.send).toHaveBeenLastCalledWith(JSON.stringify({ type: "input", dir: "down" }));
  });

  it("reconnects 3s after close", () => {
    vi.useFakeTimers();
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    render(<Harness url="ws://x/ws" nick="alice" onMessage={onMessage} ref={ref} />);
    const ws1 = FakeWS.instances[0];
    act(() => { ws1.triggerOpen(); });
    act(() => { ws1.triggerClose(); });
    expect(ref.current?.status).toBe("closed");
    expect(FakeWS.instances).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(FakeWS.instances).toHaveLength(2);
  });

  it("close triggered by error", () => {
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    render(<Harness url="ws://x/ws" nick="alice" onMessage={onMessage} ref={ref} />);
    const ws = FakeWS.instances[0];
    act(() => { ws.triggerError(); });
    expect(ws.close).toHaveBeenCalled();
  });

  it("unmount stops reconnect loop", () => {
    vi.useFakeTimers();
    const onMessage = vi.fn();
    const ref = { current: null as HarnessRef | null };
    const { unmount } = render(
      <Harness url="ws://x/ws" nick="alice" onMessage={onMessage} ref={ref} />,
    );
    const ws = FakeWS.instances[0];
    act(() => { ws.triggerOpen(); });
    act(() => { unmount(); });
    act(() => { vi.advanceTimersByTime(10000); });
    expect(FakeWS.instances).toHaveLength(1);
  });
});
