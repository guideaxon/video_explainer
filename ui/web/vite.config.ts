import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In dev the API runs separately (python -m ui.server); in production FastAPI serves dist/ itself.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:8765" } },
});
