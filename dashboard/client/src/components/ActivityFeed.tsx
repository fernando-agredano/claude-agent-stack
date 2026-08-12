import type { AgentEvent } from "../types";

export function ActivityFeed({ events }: { events: AgentEvent[] }) {
  const recent = [...events].slice(-8).reverse();

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">Actividad reciente</span>
      </div>
      {recent.length === 0 ? (
        <p className="empty-hint">Sin eventos todavia. Corre una tarea en Claude Code.</p>
      ) : (
        <div className="feed">
          {recent.map((e) => (
            <span key={e.id} className="feed__line">
              <span className="feed__time">{e.created_at.slice(11)}</span> {e.agent} {e.event_type}
              {e.detail ? ` — ${e.detail}` : ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
