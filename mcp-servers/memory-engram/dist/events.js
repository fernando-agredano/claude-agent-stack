export function logEvent(db, agent, eventType, detail = "") {
    const stmt = db.prepare(`INSERT INTO agent_events (agent, event_type, detail) VALUES (?, ?, ?)`);
    stmt.run(agent, eventType, detail);
}
export function recentEvents(db, limit = 50) {
    return db
        .prepare(`SELECT * FROM agent_events ORDER BY created_at DESC LIMIT ?`)
        .all(limit);
}
//# sourceMappingURL=events.js.map