import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { useKeyboardInput, useSwipeInput } from "./input";
import type { Dir } from "./protocol";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function KeyHarness({ onDir }: { onDir: (d: Dir) => void }) {
  useKeyboardInput(onDir);
  return null;
}

function SwipeHarness({ onDir }: { onDir: (d: Dir) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  useEffect(() => { setTarget(ref.current); }, []);
  useSwipeInput(target, onDir);
  return <div data-testid="swipe-target" ref={ref} style={{ width: 200, height: 200 }} />;
}

function dispatchKey(key: string) {
  const ev = new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true });
  window.dispatchEvent(ev);
  return ev;
}

interface FakeTouch { clientX: number; clientY: number; }
function dispatchTouch(
  el: HTMLElement,
  type: "touchstart" | "touchend",
  touches: FakeTouch[],
) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "touches", { value: type === "touchstart" ? touches : [] });
  Object.defineProperty(ev, "changedTouches", { value: touches });
  el.dispatchEvent(ev);
}

describe("useKeyboardInput", () => {
  it("maps arrow keys to directions", () => {
    const onDir = vi.fn();
    render(<KeyHarness onDir={onDir} />);
    dispatchKey("ArrowUp");
    dispatchKey("ArrowDown");
    dispatchKey("ArrowLeft");
    dispatchKey("ArrowRight");
    expect(onDir.mock.calls.map((c) => c[0])).toEqual(["up", "down", "left", "right"]);
  });

  it("maps WASD lower + upper case", () => {
    const onDir = vi.fn();
    render(<KeyHarness onDir={onDir} />);
    dispatchKey("w");
    dispatchKey("A");
    dispatchKey("s");
    dispatchKey("D");
    expect(onDir.mock.calls.map((c) => c[0])).toEqual(["up", "left", "down", "right"]);
  });

  it("ignores unmapped keys", () => {
    const onDir = vi.fn();
    render(<KeyHarness onDir={onDir} />);
    dispatchKey("Enter");
    dispatchKey(" ");
    expect(onDir).not.toHaveBeenCalled();
  });

  it("calls preventDefault on mapped keys", () => {
    const onDir = vi.fn();
    render(<KeyHarness onDir={onDir} />);
    const ev = dispatchKey("ArrowUp");
    expect(ev.defaultPrevented).toBe(true);
  });

  it("removes listener on unmount", () => {
    const onDir = vi.fn();
    const { unmount } = render(<KeyHarness onDir={onDir} />);
    unmount();
    dispatchKey("ArrowUp");
    expect(onDir).not.toHaveBeenCalled();
  });
});

describe("useSwipeInput", () => {
  it("emits right swipe when dx > threshold horizontal", () => {
    const onDir = vi.fn();
    const { getByTestId } = render(<SwipeHarness onDir={onDir} />);
    const el = getByTestId("swipe-target");
    dispatchTouch(el, "touchstart", [{ clientX: 10, clientY: 100 }]);
    dispatchTouch(el, "touchend", [{ clientX: 80, clientY: 105 }]);
    expect(onDir).toHaveBeenCalledWith("right");
  });

  it("emits left when dx < -threshold", () => {
    const onDir = vi.fn();
    const { getByTestId } = render(<SwipeHarness onDir={onDir} />);
    const el = getByTestId("swipe-target");
    dispatchTouch(el, "touchstart", [{ clientX: 100, clientY: 100 }]);
    dispatchTouch(el, "touchend", [{ clientX: 30, clientY: 100 }]);
    expect(onDir).toHaveBeenCalledWith("left");
  });

  it("emits up when dy < -threshold vertical", () => {
    const onDir = vi.fn();
    const { getByTestId } = render(<SwipeHarness onDir={onDir} />);
    const el = getByTestId("swipe-target");
    dispatchTouch(el, "touchstart", [{ clientX: 100, clientY: 200 }]);
    dispatchTouch(el, "touchend", [{ clientX: 105, clientY: 100 }]);
    expect(onDir).toHaveBeenCalledWith("up");
  });

  it("emits down when dy > threshold", () => {
    const onDir = vi.fn();
    const { getByTestId } = render(<SwipeHarness onDir={onDir} />);
    const el = getByTestId("swipe-target");
    dispatchTouch(el, "touchstart", [{ clientX: 100, clientY: 50 }]);
    dispatchTouch(el, "touchend", [{ clientX: 95, clientY: 120 }]);
    expect(onDir).toHaveBeenCalledWith("down");
  });

  it("ignores swipes under 30px threshold", () => {
    const onDir = vi.fn();
    const { getByTestId } = render(<SwipeHarness onDir={onDir} />);
    const el = getByTestId("swipe-target");
    dispatchTouch(el, "touchstart", [{ clientX: 100, clientY: 100 }]);
    dispatchTouch(el, "touchend", [{ clientX: 110, clientY: 105 }]);
    expect(onDir).not.toHaveBeenCalled();
  });

  it("ignores end without start", () => {
    const onDir = vi.fn();
    const { getByTestId } = render(<SwipeHarness onDir={onDir} />);
    const el = getByTestId("swipe-target");
    dispatchTouch(el, "touchend", [{ clientX: 200, clientY: 200 }]);
    expect(onDir).not.toHaveBeenCalled();
  });

  it("does nothing when target is null", () => {
    const onDir = vi.fn();
    function Null() {
      useSwipeInput(null, onDir);
      return null;
    }
    render(<Null />);
    expect(onDir).not.toHaveBeenCalled();
  });
});
