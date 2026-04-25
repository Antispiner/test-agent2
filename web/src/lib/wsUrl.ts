export function arenaWsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8080/ws/arena";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws/arena`;
}
