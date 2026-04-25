import { useEffect } from "react";
import type { Dir } from "./protocol";

const KEY_DIR: Record<string, Dir> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", a: "left", s: "down", d: "right",
  W: "up", A: "left", S: "down", D: "right",
};

export function useKeyboardInput(onDir: (d: Dir) => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (!dir) return;
      e.preventDefault();
      onDir(dir);
    };
    window.addEventListener("keydown", handler, { passive: false });
    return () => window.removeEventListener("keydown", handler);
  }, [onDir]);
}

const SWIPE_THRESHOLD = 30;

export function useSwipeInput(target: HTMLElement | null, onDir: (d: Dir) => void) {
  useEffect(() => {
    if (!target) return;
    let startX = 0;
    let startY = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      active = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < SWIPE_THRESHOLD && ay < SWIPE_THRESHOLD) return;
      if (ax > ay) onDir(dx > 0 ? "right" : "left");
      else onDir(dy > 0 ? "down" : "up");
    };

    target.addEventListener("touchstart", onStart, { passive: true });
    target.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      target.removeEventListener("touchstart", onStart);
      target.removeEventListener("touchend", onEnd);
    };
  }, [target, onDir]);
}
