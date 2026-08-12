import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND_PORT = process.env.DASHBOARD_PORT || "4000";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": `http://localhost:${BACKEND_PORT}`,
      "/ws": { target: `ws://localhost:${BACKEND_PORT}`, ws: true },
    },
  },
});
