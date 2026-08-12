#!/usr/bin/env node
/**
 * Wrapper para los hooks de Claude Code (SubagentStart / SubagentStop).
 * Claude Code NO pasa esta informacion por variables de entorno - la manda
 * como JSON por stdin al comando del hook:
 *
 *   { "hook_event_name": "SubagentStart", "agent_type": "researcher", "agent_prompt": "..." }
 *   { "hook_event_name": "SubagentStop",  "agent_type": "researcher", ... }
 *
 * El nombre exacto del campo que identifica al subagente puede variar entre
 * versiones de Claude Code (agent_type / subagent_type / agent_name / name),
 * por eso se prueban varios alias antes de caer a "unknown".
 *
 * Este script lee ese JSON y lo traduce a un evento en agent_events.
 */
import { openDb } from "./db.js";
import { logEvent } from "./events.js";
function firstNonEmpty(...values) {
    for (const value of values) {
        if (typeof value === "string" && value.trim().length > 0)
            return value;
    }
    return undefined;
}
let raw = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
    raw += chunk;
});
process.stdin.on("end", () => {
    try {
        const payload = raw.trim() ? JSON.parse(raw) : {};
        const hookEventName = payload.hook_event_name;
        const agent = firstNonEmpty(payload.agent_type, payload.subagent_type, payload.agent_name, payload.name) || "unknown";
        const detail = firstNonEmpty(payload.agent_prompt, payload.last_assistant_message, payload.prompt, payload.description) || "";
        const eventType = hookEventName === "SubagentStop" ? "finished" : "started";
        const db = openDb();
        logEvent(db, agent, eventType, detail);
        db.close();
    }
    catch (err) {
        console.error("hook-log-event: no se pudo procesar la entrada del hook:", err);
    }
    process.exit(0);
});
//# sourceMappingURL=hook-log-event.js.map
