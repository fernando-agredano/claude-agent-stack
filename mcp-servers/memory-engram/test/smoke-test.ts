import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { openDb } from "../src/db.js";
import { MemoryStore } from "../src/memory.js";

const TEST_DB_PATH = path.join(process.cwd(), "data", "test-memory.db");

for (const suffix of ["", "-wal", "-shm"]) {
  const p = TEST_DB_PATH + suffix;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

const db = openDb(TEST_DB_PATH);
const memory = new MemoryStore(db, "local");

console.log("1) remember() guarda una memoria nueva...");
const r1 = memory.remember({
  text: "El proyecto usa Python 3.11 y no soporta Windows",
  tags: ["proyecto", "requisitos"],
  importance: 8,
});
assert.strictEqual(r1.deduplicated, false);
console.log("   OK, id:", r1.id);

console.log("2) recall() encuentra la memoria por similitud...");
const results = memory.recall("que version de Python usa el proyecto");
assert.ok(results.length > 0);
assert.strictEqual(results[0].id, r1.id);
console.log("   OK, score:", results[0].score.toFixed(3));

console.log("3) remember() con texto casi identico deduplica...");
const r2 = memory.remember({
  text: "El proyecto usa Python 3.11 y no soporta Windows.",
  tags: ["proyecto"],
  importance: 9,
});
assert.strictEqual(r2.deduplicated, true);
assert.strictEqual(r2.id, r1.id);
console.log("   OK, no se duplico");

console.log("4) remember() con texto distinto crea una fila nueva...");
const r3 = memory.remember({
  text: "El usuario prefiere que el dashboard use React en el frontend",
  tags: ["preferencia", "dashboard"],
  importance: 7,
});
assert.notStrictEqual(r3.id, r1.id);
console.log("   OK, id nuevo:", r3.id);

console.log("5) listAll() devuelve ambas memorias...");
const all = memory.listAll();
assert.strictEqual(all.length, 2);
console.log("   OK:", all.length, "memorias");

console.log("6) stats() refleja el total y tags correctamente...");
const stats = memory.stats();
assert.strictEqual(stats.total, 2);
assert.ok(stats.topTags.some((t) => t.tag === "proyecto"));
console.log("   OK:", stats);

console.log("7) forget() elimina una memoria...");
const deleted = memory.forget(r3.id);
assert.strictEqual(deleted, true);
const statsAfter = memory.stats();
assert.strictEqual(statsAfter.total, 1);
console.log("   OK, quedo:", statsAfter.total, "memoria(s)");

db.close();
for (const suffix of ["", "-wal", "-shm"]) {
  const p = TEST_DB_PATH + suffix;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log("\nTodos los tests de memory-engram pasaron.");
