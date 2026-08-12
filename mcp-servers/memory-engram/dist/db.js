import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Se calcula relativo a la ubicacion de este archivo (no a process.cwd()),
// para que de el mismo resultado sin importar desde que carpeta se invoque
// el script (ej. un hook de Claude Code que corre con otro cwd).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, "..", "data", "memory.db");
export function openDb(dbPath = process.env.MEMORY_DB_PATH || DEFAULT_DB_PATH) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      importance INTEGER NOT NULL DEFAULT 5,
      embedding TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent TEXT NOT NULL,
      event_type TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agent_events_created_at ON agent_events(created_at);
  `);
    return db;
}
//# sourceMappingURL=db.js.map