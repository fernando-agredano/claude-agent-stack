import { useState } from "react";
import { useAgentStatuses } from "./hooks/useAgentStatuses";
import { usePolledData } from "./hooks/usePolledData";
import { AgentCard } from "./components/AgentCard";
import { MemoryPanel } from "./components/MemoryPanel";
import { ActivityFeed } from "./components/ActivityFeed";
import { MetricRow } from "./components/MetricRow";
import { VaultGraphPanel } from "./components/VaultGraphPanel";
import { ActivityChart } from "./components/ActivityChart";
import { EventTypeDonut } from "./components/EventTypeDonut";
import { BarListChart } from "./components/BarListChart";
import type { Summary, MemoryItem, AgentEvent, VaultGraph, Analytics } from "./types";
import "./App.css";

const EMPTY_SUMMARY: Summary = {
  agentsWorking: 0,
  agentsIdle: 0,
  agentsError: 0,
  memoriesTotal: 0,
  notesTotal: 0,
  eventsToday: 0,
};

const EMPTY_ANALYTICS: Analytics = {
  timeseries: [],
  byAgent: [],
  byType: [],
  durations: [],
};

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = (minutes / 60).toFixed(1);
  return `${hours}h`;
}

export default function App() {
  const { agents, connectionState } = useAgentStatuses();
  const { data: summary } = usePolledData<Summary>("/api/summary", 4000, EMPTY_SUMMARY);
  const { data: memories } = usePolledData<MemoryItem[]>("/api/memories", 5000, []);
  const { data: events } = usePolledData<AgentEvent[]>("/api/events?since=0", 3000, []);
  const { data: vaultGraph } = usePolledData<VaultGraph>("/api/vault/graph", 8000, { nodes: [], links: [] });
  const { data: analytics } = usePolledData<Analytics>("/api/analytics", 5000, EMPTY_ANALYTICS);

  const [onlyWorking, setOnlyWorking] = useState(false);
  const visibleAgents = onlyWorking ? agents.filter((a) => a.status === "working") : agents;

  const agentCountItems = analytics.byAgent.map((a) => ({
    label: a.agent,
    value: a.count,
    displayValue: `${a.count}`,
  }));

  const durationItems = analytics.durations.map((d) => ({
    label: d.agent,
    value: d.avgMs,
    displayValue: formatDuration(d.avgMs),
  }));

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__brand">
          <svg className="dashboard__logo" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <rect x="13" y="6" width="22" height="15" rx="4" fill="var(--surface)" stroke="var(--grid-line)" />
            <rect x="15" y="8" width="3" height="11" rx="1.5" fill="var(--ink-muted)" opacity="0.55" />
            <rect x="9" y="12" width="22" height="15" rx="4" fill="var(--surface)" stroke="var(--grid-line)" />
            <rect x="11" y="14" width="3" height="11" rx="1.5" fill="var(--accent)" />
            <rect x="5" y="18" width="22" height="15" rx="4" fill="var(--surface)" stroke="var(--grid-line)" />
            <rect className="dashboard__logo-pulse" x="7" y="20" width="3" height="11" rx="1.5" fill="var(--working)" />
          </svg>
          <div className="dashboard__wordmark">
            <span className="dashboard__wordmark-eyebrow">Claude</span>
            <span className="dashboard__wordmark-title">Agent Stack</span>
          </div>
        </div>
        <div className="dashboard__header-right">
          <button
            className={`filter-btn ${onlyWorking ? "filter-btn--active" : ""}`}
            onClick={() => setOnlyWorking((v) => !v)}
          >
            Solo trabajando
          </button>
          <span className={`live-badge live-badge--${connectionState}`}>
            <span className="live-badge__dot" />
            {connectionState === "connected" && "En vivo"}
            {connectionState === "connecting" && "Conectando..."}
            {connectionState === "disconnected" && "Reconectando"}
          </span>
        </div>
      </header>

      <MetricRow summary={summary} analytics={analytics} />

      <div className="chart-grid chart-grid--wide">
        <div className="panel panel--chart">
          <div className="panel__header">
            <span className="panel__title">Actividad — últimas 24h</span>
          </div>
          <ActivityChart data={analytics.timeseries} />
        </div>

        <div className="panel panel--chart">
          <div className="panel__header">
            <span className="panel__title">Eventos por tipo</span>
          </div>
          <EventTypeDonut data={analytics.byType} />
        </div>
      </div>

      <div className="chart-grid chart-grid--even">
        <div className="panel panel--chart">
          <div className="panel__header">
            <span className="panel__title">Eventos por agente</span>
          </div>
          <BarListChart items={agentCountItems} color="var(--accent)" />
        </div>

        <div className="panel panel--chart">
          <div className="panel__header">
            <span className="panel__title">Duración promedio por tarea</span>
          </div>
          <BarListChart items={durationItems} color="var(--working)" />
        </div>
      </div>

      <div className="dashboard__grid">
        <div className="dashboard__col">
          <div className="panel">
            <div className="panel__header">
              <span className="panel__title">Agentes</span>
            </div>
            {visibleAgents.length === 0 ? (
              <p className="empty-hint">
                Sin agentes con actividad todavia. Pide una tarea en Claude Code o genera un evento
                de prueba con <code>node mcp-servers/memory-engram/dist/log-event.js coder started "prueba"</code>.
              </p>
            ) : (
              <div className="agent-list">
                {visibleAgents.map((agent) => (
                  <AgentCard key={agent.agent} agent={agent} events={events} />
                ))}
              </div>
            )}
          </div>
          <ActivityFeed events={events} />
        </div>

        <div className="dashboard__col">
          <MemoryPanel memories={memories} />
          <VaultGraphPanel graph={vaultGraph} />
        </div>
      </div>
    </div>
  );
}
