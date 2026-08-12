import { useState } from "react";
import type { AgentStatus } from "../hooks/useAgentStatuses";
import type { AgentEvent } from "../types";

const STATUS_LABEL: Record<AgentStatus["status"], string> = {
  working: "Trabajando",
  idle: "Inactivo",
  error: "Error",
};

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
}

export function AgentCard({ agent, events }: { agent: AgentStatus; events: AgentEvent[] }) {
  const [open, setOpen] = useState(false);
  const history = events.filter((e) => e.agent === agent.agent).slice(-6).reverse();

  return (
    <div className={`agent-card agent-card--${agent.status}`}>
      <div className={`agent-card__stripe agent-card__stripe--${agent.status}`} />
      <div className="agent-card__body">
        <div className="agent-card__row">
          <span className="agent-card__name">{agent.agent}</span>
          <div className="agent-card__meta">
            <span className={`agent-card__status agent-card__status--${agent.status}`}>{STATUS_LABEL[agent.status]}</span>
            <span className="agent-card__time">{formatElapsed(agent.elapsed_ms)}</span>
            <button className="icon-btn icon-btn--small" onClick={() => setOpen((v) => !v)} aria-label="Ver historial">
              {open ? "▴" : "▾"}
            </button>
          </div>
        </div>
        <p className="agent-card__detail">{agent.detail || "Sin detalle"}</p>

        {open && (
          <div className="agent-card__history">
            {history.length === 0 ? (
              <span>Sin eventos recientes</span>
            ) : (
              history.map((e) => (
                <span key={e.id}>
                  {e.created_at.slice(11)} {e.event_type} {e.detail ? `— ${e.detail}` : ""}
                </span>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
