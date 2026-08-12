import { useMemo } from "react";
import * as d3 from "d3";
import type { TypeCount } from "../types";

const SIZE = 190;
const RADIUS = SIZE / 2;
const THICKNESS = 26;

const TYPE_LABEL: Record<string, string> = {
  started: "Iniciados",
  finished: "Finalizados",
  error: "Errores",
  task_assigned: "Asignados",
};

const TYPE_COLOR: Record<string, string> = {
  started: "var(--accent)",
  finished: "var(--working)",
  error: "var(--error)",
  task_assigned: "#B27B0B",
};

export function EventTypeDonut({ data }: { data: TypeCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const arcs = useMemo(() => {
    const pie = d3
      .pie<TypeCount>()
      .value((d) => d.count)
      .sort(null);
    const arcGen = d3
      .arc<d3.PieArcDatum<TypeCount>>()
      .innerRadius(RADIUS - THICKNESS)
      .outerRadius(RADIUS - 2);

    return pie(data).map((slice) => ({
      path: arcGen(slice) ?? "",
      color: TYPE_COLOR[slice.data.event_type] ?? "var(--ink-muted)",
      data: slice.data,
    }));
  }, [data]);

  if (total === 0) {
    return <p className="empty-hint">Sin eventos todavia para clasificar.</p>;
  }

  return (
    <div className="donut">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <g transform={`translate(${RADIUS},${RADIUS})`}>
          {arcs.map((a) => (
            <path key={a.data.event_type} d={a.path} fill={a.color} stroke="var(--surface)" strokeWidth={1.5} />
          ))}
          <text textAnchor="middle" dy="-0.15em" fontSize={22} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-display)">
            {total}
          </text>
          <text textAnchor="middle" dy="1.4em" fontSize={10} fill="var(--ink-muted)" fontFamily="var(--font-mono)">
            Eventos
          </text>
        </g>
      </svg>

      <div className="donut__legend">
        {data.map((d) => (
          <div key={d.event_type} className="donut__legend-row">
            <span className="legend__dot" style={{ background: TYPE_COLOR[d.event_type] ?? "var(--ink-muted)" }} />
            <span className="donut__legend-label">{TYPE_LABEL[d.event_type] ?? d.event_type}</span>
            <span className="donut__legend-value">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
