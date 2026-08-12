import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import {
  openDb,
  getAgentStatuses,
  getEventsSince,
  getLatestEventId,
  countEventsToday,
  getMemories,
  getMemoryStats,
  getEventsTimeseries,
  getEventCountsByAgent,
  getEventCountsByType,
  getTaskDurations,
} from "./db.js";
import { getVaultGraph, getVaultStats } from "./vault-reader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.DASHBOARD_PORT || 4000);
const POLL_INTERVAL_MS = Number(process.env.DASHBOARD_POLL_INTERVAL_MS || 1000);

// Relativo a este archivo (no a process.cwd()), para dar el mismo resultado
// sin importar desde donde se invoque "npm run dev" / "node dist/index.js".
const DB_PATH =
  process.env.MEMORY_DB_PATH ||
  path.resolve(__dirname, "../../../mcp-servers/memory-engram/data/memory.db");
const VAULT_PATH = process.env.VAULT_PATH || path.resolve(__dirname, "../../../vault-demo");

const db = openDb(DB_PATH);

const app = express();
app.use(cors());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbPath: DB_PATH, vaultPath: VAULT_PATH });
});

app.get("/api/status", (_req, res) => {
  res.json(getAgentStatuses(db));
});

app.get("/api/events", (req, res) => {
  const since = Number(req.query.since ?? 0);
  res.json(getEventsSince(db, Number.isNaN(since) ? 0 : since));
});

app.get("/api/summary", (_req, res) => {
  const agents = getAgentStatuses(db);
  const memoryStats = getMemoryStats(db);
  const vaultStats = getVaultStats(VAULT_PATH);
  res.json({
    agentsWorking: agents.filter((a) => a.status === "working").length,
    agentsIdle: agents.filter((a) => a.status === "idle").length,
    agentsError: agents.filter((a) => a.status === "error").length,
    memoriesTotal: memoryStats.total,
    notesTotal: vaultStats.totalNotes,
    eventsToday: countEventsToday(db),
  });
});

app.get("/api/memories", (req, res) => {
  const limit = Number(req.query.limit ?? 20);
  res.json(getMemories(db, Number.isNaN(limit) ? 20 : limit));
});

app.get("/api/memories/stats", (_req, res) => {
  res.json(getMemoryStats(db));
});

app.get("/api/analytics", (_req, res) => {
  res.json({
    timeseries: getEventsTimeseries(db, 24),
    byAgent: getEventCountsByAgent(db),
    byType: getEventCountsByType(db),
    durations: getTaskDurations(db),
  });
});

app.get("/api/vault/graph", (_req, res) => {
  res.json(getVaultGraph(VAULT_PATH));
});

app.get("/api/vault/stats", (_req, res) => {
  res.json(getVaultStats(VAULT_PATH));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

let lastSeenId = getLatestEventId(db);

function currentSnapshot() {
  return {
    type: "status",
    agents: getAgentStatuses(db),
  };
}

wss.on("connection", (ws: WebSocket) => {
  ws.send(JSON.stringify(currentSnapshot()));
});

function broadcast(payload: unknown) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

setInterval(() => {
  const newEvents = getEventsSince(db, lastSeenId);
  if (newEvents.length > 0) {
    lastSeenId = newEvents[newEvents.length - 1]!.id;
    broadcast({ ...currentSnapshot(), newEvents });
  }
}, POLL_INTERVAL_MS);

server.listen(PORT, () => {
  console.log(`Dashboard backend escuchando en http://localhost:${PORT}`);
  console.log(`  REST:      http://localhost:${PORT}/api/status`);
  console.log(`  WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`  DB:        ${DB_PATH}`);
  console.log(`  Vault:     ${VAULT_PATH}`);
});
