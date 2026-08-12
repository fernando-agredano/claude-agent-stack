#!/usr/bin/env node
/**
 * CLI para pruebas manuales: node dist/log-event.js <agent> <started|finished|error|task_assigned> ["detalle"]
 * Para los hooks REALES de Claude Code usa hook-log-event.js en su lugar (lee JSON de stdin).
 */
import { openDb } from "./db.js";
import { logEvent } from "./events.js";
const [, , agent, eventType, detail] = process.argv;
if (!agent || !eventType) {
    console.error("Uso: log-event.js <agent> <started|finished|error|task_assigned> [detalle]");
    process.exit(1);
}
const validTypes = ["started", "finished", "error", "task_assigned"];
if (!validTypes.includes(eventType)) {
    console.error(`event_type invalido: "${eventType}". Usa uno de: ${validTypes.join(", ")}`);
    process.exit(1);
}
const db = openDb();
logEvent(db, agent, eventType, detail ?? "");
db.close();
//# sourceMappingURL=log-event.js.map