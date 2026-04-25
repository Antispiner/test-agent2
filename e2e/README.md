# Snake Arena E2E

Playwright suite. Boots:

- `mock-server.ts` — minimal Node WS implementing `api/spec.md` (no backend yet).
- `web/` (sibling) Vite dev server, which proxies `/ws` → `ws://localhost:8080`.

## Run

```bash
cd web && npm install && cd -
cd e2e && npm install && npx playwright install chromium
npm test
```

## Why a mock server (not docker compose)

The backend PR for issue #1 is not yet delivered (routing-error bug filed). Per
the testing task brief, this branch ships a mock that satisfies the same wire
spec so the E2E flow can be validated end-to-end. When the real Java server
lands, swap `webServer[0]` in `playwright.config.ts` for `docker compose up`.
