import { useCallback, useEffect, useRef, useState } from "react";
import { isServerMsg, type ClientMsg, type ServerMsg } from "./protocol";

export type ConnectionStatus = "idle" | "connecting" | "open" | "closed";

interface UseArenaSocketOpts {
  url: string;
  nick: string | null;
  onMessage: (m: ServerMsg) => void;
}

const RECONNECT_MS = 3000;

export function useArenaSocket({ url, nick, onMessage }: UseArenaSocketOpts) {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const nickRef = useRef(nick);
  const reconnectTimerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { nickRef.current = nick; }, [nick]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!nick) return;
    stoppedRef.current = false;

    const connect = () => {
      if (stoppedRef.current) return;
      setStatus("connecting");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus("open");
        const n = nickRef.current;
        if (n) ws.send(JSON.stringify({ type: "join", nick: n }));
      };
      ws.onmessage = (ev) => {
        try {
          const parsed: unknown = JSON.parse(ev.data);
          if (isServerMsg(parsed)) onMessageRef.current(parsed);
        } catch {
          // ignore malformed frames
        }
      };
      ws.onclose = () => {
        setStatus("closed");
        wsRef.current = null;
        if (!stoppedRef.current) {
          reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_MS);
        }
      };
      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      stoppedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.onmessage = null;
        ws.onopen = null;
        ws.close();
      }
    };
  }, [url, nick]);

  return { status, send };
}
