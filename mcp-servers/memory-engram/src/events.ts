import type Database from "better-sqlite3";

export type EventType = "started" | "finished" | "error" | "task_assigned";

export function logEvent(db: Database.Database, agent: string, eventType: EventType, detail: string = ""): void {
  const stmt = db.prepare(
    `INSERT INTO agent_events (agent, event_type, detail) VALUES (?, ?, ?)`
  );
  stmt.run(agent, eventType, detail);
}

export function recentEvents(db: Database.Database, limit: number = 50) {
  return db
    .prepare(`SELECT * FROM agent_events ORDER BY created_at DESC LIMIT ?`)
    .all(limit);
}
