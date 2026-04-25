import { useEffect, useState } from "react";
import { LobbyPage } from "./pages/LobbyPage";
import { ArenaPage } from "./pages/ArenaPage";

type Route = "lobby" | "arena";

function readNickFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const n = params.get("nick");
  return n && n.trim() ? n.trim().slice(0, 16) : null;
}

function readRouteFromUrl(): Route {
  if (typeof window === "undefined") return "lobby";
  const path = window.location.pathname.replace(/\/+$/, "");
  return path.endsWith("/join") || path.endsWith("/arena") ? "arena" : "lobby";
}

export function App() {
  const initialNick = readNickFromUrl();
  const initialRoute: Route =
    initialNick && readRouteFromUrl() === "arena" ? "arena" : "lobby";

  const [route, setRoute] = useState<Route>(initialRoute);
  const [nick, setNick] = useState<string | null>(
    initialRoute === "arena" ? initialNick : null,
  );

  useEffect(() => {
    const onPop = () => {
      const r = readRouteFromUrl();
      const n = readNickFromUrl();
      setRoute(r === "arena" && n ? "arena" : "lobby");
      setNick(r === "arena" ? n : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const join = (n: string) => {
    setNick(n);
    setRoute("arena");
    const url = new URL(window.location.href);
    url.pathname = "/join";
    url.searchParams.set("nick", n);
    window.history.pushState({}, "", url.toString());
  };

  const leave = () => {
    setRoute("lobby");
    setNick(null);
    const url = new URL(window.location.href);
    url.pathname = "/";
    url.searchParams.delete("nick");
    window.history.pushState({}, "", url.toString());
  };

  if (route === "arena" && nick) {
    return <ArenaPage nick={nick} onLeave={leave} />;
  }
  return <LobbyPage initialNick={initialNick ?? ""} onJoin={join} />;
}
