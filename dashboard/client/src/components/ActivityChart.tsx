import { useMemo, useState, type MouseEvent } from "react";
import * as d3 from "d3";
import type { TimeseriesPoint } from "../types";

const WIDTH = 600;
const HEIGHT = 200;
const MARGIN = { top: 10, right: 10, bottom: 22, left: 28 };
const INNER_W = WIDTH - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top - MARGIN.bottom;

export function ActivityChart({ data }: { data: TimeseriesPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { linePath, areaPath, points, yTicks, xLabels } = useMemo(() => {
    const x = d3.scaleLinear().domain([0, Math.max(1, data.length - 1)]).range([0, INNER_W]);
    const maxCount = Math.max(1, ...data.map((d) => d.count));
    const y = d3.scaleLinear().domain([0, maxCount]).nice().range([INNER_H, 0]);

    const line = d3
      .line<TimeseriesPoint>()
      .x((_d, i) => x(i))
      .y((d) => y(d.count))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<TimeseriesPoint>()
      .x((_d, i) => x(i))
      .y0(INNER_H)
      .y1((d) => y(d.count))
      .curve(d3.curveMonotoneX);

    const points = data.map((d, i) => ({
      x: x(i),
      y: y(d.count),
      count: d.count,
      hour: d.bucket.slice(11, 16),
    }));

    const step = Math.max(1, Math.ceil(data.length / 6));
    const xLabels = points.filter((_, i) => i % step === 0);

    return {
      linePath: line(data) ?? "",
      areaPath: area(data) ?? "",
      points,
      yTicks: y.ticks(4).map((v) => ({ value: v, y: y(v) })),
      xLabels,
    };
  }, [data]);

  const hovered = hoverIdx !== null ? points[hoverIdx] : null;

  function handleMove(evt: MouseEvent<SVGRectElement>) {
    const rect = evt.currentTarget.getBoundingClientRect();
    const ratio = (evt.clientX - rect.left) / rect.width;
    const idx = Math.round(ratio * (points.length - 1));
    setHoverIdx(Math.min(points.length - 1, Math.max(0, idx)));
  }

  const tooltipX = hovered ? Math.min(WIDTH - 92, MARGIN.left + hovered.x + 10) : 0;

  return (
    <svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
      <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
        {yTicks.map((t) => (
          <g key={t.value}>
            <line x1={0} x2={INNER_W} y1={t.y} y2={t.y} stroke="var(--grid-line)" strokeWidth={0.5} />
            <text x={-8} y={t.y} dy="0.32em" textAnchor="end" fontSize={9} fontFamily="var(--font-mono)" fill="var(--ink-muted)">
              {t.value}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="var(--accent-soft)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} />

        {xLabels.map((p, i) => (
          <text
            key={i}
            x={p.x}
            y={INNER_H + 16}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--font-mono)"
            fill="var(--ink-muted)"
          >
            {p.hour}
          </text>
        ))}

        {hovered && (
          <>
            <line x1={hovered.x} x2={hovered.x} y1={0} y2={INNER_H} stroke="var(--grid-line)" strokeWidth={1} />
            <circle cx={hovered.x} cy={hovered.y} r={3.5} fill="var(--accent)" />
          </>
        )}

        <rect
          x={0}
          y={0}
          width={INNER_W}
          height={INNER_H}
          fill="transparent"
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        />
      </g>

      {hovered && (
        <g transform={`translate(${tooltipX}, ${MARGIN.top + 4})`}>
          <rect width={84} height={34} rx={6} fill="var(--surface)" stroke="var(--grid-line)" />
          <text x={8} y={14} fontSize={9} fontFamily="var(--font-mono)" fill="var(--ink-muted)">
            {hovered.hour}
          </text>
          <text x={8} y={27} fontSize={12} fontFamily="var(--font-display)" fill="var(--ink)">
            {hovered.count} eventos
          </text>
        </g>
      )}
    </svg>
  );
}
