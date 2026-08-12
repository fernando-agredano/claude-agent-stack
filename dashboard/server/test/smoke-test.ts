import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import Database from "better-sqlite3";
import { WebSocket } from "ws";

const TEST_DB = path.join(process.cwd(), "test", ".tmp-dashboard.db");
const TEST_VAULT = path.join(process.cwd(), "test", ".tmp-vault");
const PORT = 4099;

for (const suffix of ["", "-wal", "-shm"]) {
  const p = TEST_DB + suffix;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
if (fs.existsSync(TEST_VAULT)) fs.rmSync(TEST_VAULT, { recursive: true, force: true });
fs.mkdirSync(path.join(TEST_VAULT, "Agents"), { recursive: true });
fs.writeFileSync(
  path.join(TEST_VAULT, "Agents", "nota-uno.md"),
  "---\ntags: [demo]\n---\nContenido de prueba con [[nota-dos]].\n"
);
fs.writeFileSync(path.join(TEST_VAULT, "Agents", "nota-dos.md"), "---\ntags: [demo]\n---\nOtra nota.\n");

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("1) Levantando el servidor del dashboard como proceso real...");
  const server = spawn("node", ["dist/index.js"], {
    env: {
      ...process.env,
      MEMORY_DB_PATH: TEST_DB,
      VAULT_PATH: TEST_VAULT,
      DASHBOARD_PORT: String(PORT),
      DASHBOARD_POLL_INTERVAL_MS: "200",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverReady = false;
  server.stdout.on("data", (chunk) => {
    if (chunk.toString().includes("escuchando")) serverReady = true;
  });
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let i = 0; i < 50 && !serverReady; i++) await sleep(100);
  assert.ok(serverReady, "el servidor no reporto estar listo a tiempo");
  console.log("   OK, servidor arriba en el puerto", PORT);

  console.log("2) GET /api/health responde ok...");
  const health = await fetch(`http://localhost:${PORT}/api/health`).then((r) => r.json());
  assert.strictEqual(health.ok, true);
  console.log("   OK");

  console.log("3) GET /api/vault/graph refleja las 2 notas y su link...");
  const graph = await fetch(`http://localhost:${PORT}/api/vault/graph`).then((r) => r.json());
  assert.strictEqual(graph.nodes.length, 2);
  assert.strictEqual(graph.links.length, 1);
  console.log("   OK:", graph.nodes.length, "nodos,", graph.links.length, "link");

  console.log("4) GET /api/vault/stats cuenta las notas...");
  const vaultStats = await fetch(`http://localhost:${PORT}/api/vault/stats`).then((r) => r.json());
  assert.strictEqual(vaultStats.totalNotes, 2);
  console.log("   OK");

  console.log("5) Insertamos una memoria directo en la BD y la leemos por REST...");
  const db = new Database(TEST_DB);
  db.prepare(
    `INSERT INTO memories (text, tags, importance, embedding) VALUES (?, ?, ?, ?)`
  ).run("el stack usa node y typescript", JSON.stringify(["stack"]), 8, JSON.stringify([0.1, 0.2]));
  db.close();

  const memories = await fetch(`http://localhost:${PORT}/api/memories`).then((r) => r.json());
  assert.strictEqual(memories.length, 1);
  assert.strictEqual(memories[0].importance, 8);
  console.log("   OK:", memories[0].text);

  console.log("6) GET /api/memories/stats refleja el total...");
  const memStats = await fetch(`http://localhost:${PORT}/api/memories/stats`).then((r) => r.json());
  assert.strictEqual(memStats.total, 1);
  console.log("   OK");

  console.log("7) Conectamos WebSocket e insertamos eventos de agentes...");
  const ws = new WebSocket(`ws://localhost:${PORT}/ws`);
  const receivedMessages: any[] = [];
  ws.on("message", (data) => receivedMessages.push(JSON.parse(data.toString())));
  await new Promise((resolve) => ws.on("open", resolve));

  const db2 = new Database(TEST_DB);
  db2.prepare(`INSERT INTO agent_events (agent, event_type, detail) VALUES (?, ?, ?)`).run(
    "coder",
    "started",
    "prueba"
  );
  db2.close();

  await sleep(600);
  const status = await fetch(`http://localhost:${PORT}/api/status`).then((r) => r.json());
  assert.strictEqual(status.length, 1);
  assert.strictEqual(status[0].status, "working");
  console.log("   OK:", status[0].agent, status[0].status);

  console.log("8) GET /api/summary agrega todo correctamente...");
  const summary = await fetch(`http://localhost:${PORT}/api/summary`).then((r) => r.json());
  assert.strictEqual(summary.agentsWorking, 1);
  assert.strictEqual(summary.memoriesTotal, 1);
  assert.strictEqual(summary.notesTotal, 2);
  console.log("   OK:", summary);

  ws.close();
  server.kill();

  for (const suffix of ["", "-wal", "-shm"]) {
    const p = TEST_DB + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.rmSync(TEST_VAULT, { recursive: true, force: true });

  console.log("\nTodos los tests end-to-end del dashboard backend pasaron.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fallo el smoke test:", err);
  process.exit(1);
});
