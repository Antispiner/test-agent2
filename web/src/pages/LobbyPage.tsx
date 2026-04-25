import { useState, type FormEvent } from "react";

interface Props {
  initialNick?: string;
  onJoin: (nick: string) => void;
}

const NICK_MIN = 1;
const NICK_MAX = 16;

export function LobbyPage({ initialNick = "", onJoin }: Props) {
  const [nick, setNick] = useState(initialNick);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = nick.trim();
    if (trimmed.length < NICK_MIN || trimmed.length > NICK_MAX) {
      setError(`Nickname must be ${NICK_MIN}–${NICK_MAX} chars`);
      return;
    }
    setError(null);
    onJoin(trimmed);
  };

  return (
    <main style={styles.root}>
      <form onSubmit={submit} style={styles.card} aria-label="Join arena">
        <h1 style={styles.title}>Snake Arena</h1>
        <p style={styles.subtitle}>Eat apples. Outlast everyone.</p>
        <label htmlFor="nick" style={styles.label}>Nickname</label>
        <input
          id="nick"
          autoFocus
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          maxLength={NICK_MAX}
          placeholder="e.g. Mamba"
          style={styles.input}
          aria-invalid={error !== null}
          aria-describedby={error ? "nick-error" : undefined}
        />
        {error && (
          <div id="nick-error" role="alert" style={styles.error}>{error}</div>
        )}
        <button type="submit" style={styles.button}>Join Arena</button>
      </form>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: "100vw",
    height: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(circle at 30% 20%, #1a1a3a 0%, #0a0a14 60%)",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: "32px 28px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    backdropFilter: "blur(10px)",
  },
  title: { margin: 0, fontSize: 28, letterSpacing: -0.5 },
  subtitle: { margin: "0 0 8px", color: "#9090a8", fontSize: 14 },
  label: { fontSize: 12, color: "#a0a0c0", letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    padding: "12px 14px",
    background: "#10101e",
    border: "1px solid #2a2a44",
    borderRadius: 10,
    color: "#f0f0f8",
    outline: "none",
    fontSize: 16,
  },
  error: { color: "#ff7080", fontSize: 13 },
  button: {
    marginTop: 8,
    padding: "12px 14px",
    background: "linear-gradient(135deg, #5b8def 0%, #b66dff 100%)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
  },
};
