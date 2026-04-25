import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(here, "../web");
const mockPort = process.env.MOCK_PORT ?? "8090";

export default defineConfig({
  root: webRoot,
  plugins: [react()],
  server: {
    proxy: {
      "/ws": { target: `ws://localhost:${mockPort}`, ws: true },
    },
  },
});
