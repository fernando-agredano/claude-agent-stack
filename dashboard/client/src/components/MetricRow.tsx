import type { CSSProperties } from "react";
import type { Analytics, Summary } from "../types";

export function MetricRow({ summary, analytics }: { summary: Summary; analytics: Analytics }) {
  const lastHourCount = analytics.timeseries.at(-1)?.count ?? 0;

  const items = [
    {
      label: "Agentes activos",
      value: summary.agentsWorking,
      color: "var(--working)",
      sub: `${summary.agentsIdle} inactivos · ${summary.agentsError} en error`,
    },
    {
      label: "Memorias",
      value: summary.memoriesTotal,
      color: "var(--accent)",
      sub: "Entradas guardadas en memory-engram",
    },
    {
      label: "Notas del vault",
      value: summary.notesTotal,
      color: "var(--folder-inbox)",
      sub: "Sincronizadas via obsidian-bridge",
    },
    {
      label: "Eventos hoy",
      value: summary.eventsToday,
      color: "var(--accent)",
      sub: `${lastHourCount} en la última hora`,
    },
  ];

  return (
    <div className="metric-row">
      {items.map((item) => (
        <div key={item.label} className="metric-card" style={{ "--metric-color": item.color } as CSSProperties}>
          <p className="metric-card__label">{item.label}</p>
          <p className="metric-card__value">{item.value}</p>
          <p className="metric-card__sub">{item.sub}</p>
        </div>
      ))}
    </div>
  );
}
