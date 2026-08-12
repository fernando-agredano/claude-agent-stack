import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
export function openDb(dbPath) {
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
function statusFromEventType(eventType) {
    if (eventType === "started" || eventType === "task_assigned")
        return "working";
    if (eventType === "error")
        return "error";
    return "idle";
}
export function getAgentStatuses(db) {
    const rows = db
        .prepare(`SELECT agent, event_type, detail, created_at
       FROM agent_events
       WHERE id IN (SELECT MAX(id) FROM agent_events GROUP BY agent)
       ORDER BY agent ASC`)
        .all();
    const now = Date.now();
    return rows.map((row) => {
        const createdAtUtc = row.created_at.replace(" ", "T") + "Z";
        const elapsed = now - new Date(createdAtUtc).getTime();
        return {
            agent: row.agent,
            status: statusFromEventType(row.event_type),
            detail: row.detail,
            last_event_at: row.created_at,
            elapsed_ms: Number.isNaN(elapsed) ? 0 : elapsed,
        };
    });
}
export function getEventsSince(db, sinceId) {
    return db
        .prepare(`SELECT * FROM agent_events WHERE id > ? ORDER BY id ASC`)
        .all(sinceId);
}
export function getLatestEventId(db) {
    const row = db.prepare(`SELECT COALESCE(MAX(id), 0) as maxId FROM agent_events`).get();
    return row.maxId;
}
export function countEventsToday(db) {
    const row = db
        .prepare(`SELECT COUNT(*) as count FROM agent_events WHERE date(created_at) = date('now')`)
        .get();
    return row.count;
}
export function getMemories(db, limit = 20) {
    const rows = db
        .prepare(`SELECT id, text, tags, importance, updated_at FROM memories ORDER BY updated_at DESC LIMIT ?`)
        .all(limit);
    return rows.map((row) => ({
        id: row.id,
        text: row.text,
        tags: JSON.parse(row.tags),
        importance: row.importance,
        updated_at: row.updated_at,
    }));
}
export function getMemoryStats(db) {
    const rows = db.prepare(`SELECT tags, importance FROM memories`).all();
    const tagCounts = new Map();
    let importanceSum = 0;
    for (const row of rows) {
        importanceSum += row.importance;
        const tags = JSON.parse(row.tags);
        for (const tag of tags) {
            tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
    }
    const topTags = [...tagCounts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    return {
        total: rows.length,
        topTags,
        avgImportance: rows.length > 0 ? Number((importanceSum / rows.length).toFixed(2)) : 0,
    };
}
//# sourceMappingURL=db.js.map