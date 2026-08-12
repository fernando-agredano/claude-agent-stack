import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type EventType = "started" | "finished" | "error" | "task_assigned";

export type AgentEventRow = {
  id: number;
  agent: string;
  event_type: EventType;
  detail: string;
  created_at: string;
};

export type AgentStatus = {
  agent: string;
  status: "working" | "idle" | "error";
  detail: string;
  last_event_at: string;
  elapsed_ms: number;
};

export type MemoryItem = {
  id: number;
  text: string;
  tags: string[];
  importance: number;
  updated_at: string;
};

export type MemoryStats = {
  total: number;
  topTags: { tag: string; count: number }[];
  avgImportance: number;
};

export function openDb(dbPath: string): Database.Database {
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

function statusFromEventType(eventType: EventType): "working" | "idle" | "error" {
  if (eventType === "started" || eventType === "task_assigned") return "working";
  if (eventType === "error") return "error";
  return "idle";
}

export function getAgentStatuses(db: Database.Database): AgentStatus[] {
  const rows = db
    .prepare(
      `SELECT agent, event_type, detail, created_at
       FROM agent_events
       WHERE id IN (SELECT MAX(id) FROM agent_events GROUP BY agent)
       ORDER BY agent ASC`
    )
    .all() as AgentEventRow[];

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

export function getEventsSince(db: Database.Database, sinceId: number): AgentEventRow[] {
  return db
    .prepare(`SELECT * FROM agent_events WHERE id > ? ORDER BY id ASC`)
    .all(sinceId) as AgentEventRow[];
}

export function getLatestEventId(db: Database.Database): number {
  const row = db.prepare(`SELECT COALESCE(MAX(id), 0) as maxId FROM agent_events`).get() as {
    maxId: number;
  };
  return row.maxId;
}

export function countEventsToday(db: Database.Database): number {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM agent_events WHERE date(created_at) = date('now')`)
    .get() as { count: number };
  return row.count;
}

export function getMemories(db: Database.Database, limit: number = 20): MemoryItem[] {
  const rows = db
    .prepare(`SELECT id, text, tags, importance, updated_at FROM memories ORDER BY updated_at DESC LIMIT ?`)
    .all(limit) as { id: number; text: string; tags: string; importance: number; updated_at: string }[];

  return rows.map((row) => ({
    id: row.id,
    text: row.text,
    tags: JSON.parse(row.tags) as string[],
    importance: row.importance,
    updated_at: row.updated_at,
  }));
}

export type TimeseriesPoint = { bucket: string; count: number };

export function getEventsTimeseries(db: Database.Database, hours: number = 24): TimeseriesPoint[] {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m-%dT%H:00:00', created_at) as bucket, COUNT(*) as count
       FROM agent_events
       WHERE created_at >= datetime('now', ?)
       GROUP BY bucket`
    )
    .all(`-${hours} hours`) as { bucket: string; count: number }[];

  const counts = new Map(rows.map((r) => [r.bucket, r.count]));
  const now = new Date();
  now.setUTCMinutes(0, 0, 0);

  const result: TimeseriesPoint[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const bucketDate = new Date(now.getTime() - i * 3600_000);
    const bucket = bucketDate.toISOString().slice(0, 13) + ":00:00";
    result.push({ bucket, count: counts.get(bucket) ?? 0 });
  }

  return result;
}

export type AgentCount = { agent: string; count: number };

export function getEventCountsByAgent(db: Database.Database): AgentCount[] {
  return db
    .prepare(`SELECT agent, COUNT(*) as count FROM agent_events GROUP BY agent ORDER BY count DESC`)
    .all() as AgentCount[];
}

export type TypeCount = { event_type: EventType; count: number };

export function getEventCountsByType(db: Database.Database): TypeCount[] {
  return db
    .prepare(`SELECT event_type, COUNT(*) as count FROM agent_events GROUP BY event_type`)
    .all() as TypeCount[];
}

export type DurationStat = { agent: string; avgMs: number; count: number };

export function getTaskDurations(db: Database.Database): DurationStat[] {
  const rows = db
    .prepare(`SELECT agent, event_type, created_at FROM agent_events ORDER BY agent ASC, created_at ASC, id ASC`)
    .all() as { agent: string; event_type: EventType; created_at: string }[];

  const openStart = new Map<string, number>();
  const durations = new Map<string, number[]>();

  for (const row of rows) {
    const ts = new Date(row.created_at.replace(" ", "T") + "Z").getTime();
    if (row.event_type === "started" || row.event_type === "task_assigned") {
      openStart.set(row.agent, ts);
    } else if (row.event_type === "finished") {
      const start = openStart.get(row.agent);
      if (start !== undefined && ts >= start) {
        const list = durations.get(row.agent) ?? [];
        list.push(ts - start);
        durations.set(row.agent, list);
      }
      openStart.delete(row.agent);
    } else if (row.event_type === "error") {
      openStart.delete(row.agent);
    }
  }

  return [...durations.entries()]
    .map(([agent, list]) => ({
      agent,
      avgMs: Math.round(list.reduce((a, b) => a + b, 0) / list.length),
      count: list.length,
    }))
    .sort((a, b) => b.avgMs - a.avgMs);
}

export function getMemoryStats(db: Database.Database): MemoryStats {
  const rows = db.prepare(`SELECT tags, importance FROM memories`).all() as {
    tags: string;
    importance: number;
  }[];

  const tagCounts = new Map<string, number>();
  let importanceSum = 0;

  for (const row of rows) {
    importanceSum += row.importance;
    const tags = JSON.parse(row.tags) as string[];
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
