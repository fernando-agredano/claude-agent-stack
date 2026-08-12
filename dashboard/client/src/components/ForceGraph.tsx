import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { VaultGraph } from "../types";

const FOLDER_COLORS: Record<string, string> = {
  Agents: "var(--folder-agents)",
  "00-Inbox": "var(--folder-inbox)",
};

function colorForFolder(folder: string): string {
  return FOLDER_COLORS[folder] ?? "var(--folder-raiz)";
}

type ForceGraphProps = {
  graph: VaultGraph;
  width: number;
  height: number;
  nodeRadius?: number;
};

type SimNode = d3.SimulationNodeDatum & { id: string; folder: string; tags: string[] };
type SimLink = d3.SimulationLinkDatum<SimNode>;

export function ForceGraph({ graph, width, height, nodeRadius = 8 }: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    if (graph.nodes.length === 0) return;

    const nodes: SimNode[] = graph.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = graph.links.map((l) => ({ source: l.source, target: l.target }));

    const neighbors = new Map<string, Set<string>>();
    nodes.forEach((n) => neighbors.set(n.id, new Set([n.id])));
    graph.links.forEach((l) => {
      neighbors.get(l.source)?.add(l.target);
      neighbors.get(l.target)?.add(l.source);
    });

    const link = svg
      .append("g")
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "var(--grid-line)")
      .attr("stroke-width", 1.3);

    const node = svg
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", nodeRadius)
      .attr("fill", (d) => colorForFolder(d.folder))
      .style("cursor", "grab")
      .on("mouseenter", (_event, d) => {
        const active = neighbors.get(d.id) ?? new Set([d.id]);
        node.attr("opacity", (n) => (active.has(n.id) ? 1 : 0.15));
        link.attr("opacity", (l: any) => (l.source.id === d.id || l.target.id === d.id ? 1 : 0.08));
        link.attr("stroke", (l: any) => (l.source.id === d.id || l.target.id === d.id ? "var(--accent)" : "var(--grid-line)"));
        label.attr("opacity", (n) => (active.has(n.id) ? 1 : 0.15));
      })
      .on("mouseleave", () => {
        node.attr("opacity", 1);
        link.attr("opacity", 1).attr("stroke", "var(--grid-line)");
        label.attr("opacity", 1);
      });

    node.call(
      d3
        .drag<SVGCircleElement, SimNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    const label = svg
      .append("g")
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("fill", "var(--ink-muted)")
      .attr("font-family", "var(--font-mono)")
      .attr("font-size", 9)
      .attr("text-anchor", "middle")
      .attr("dy", -nodeRadius - 5)
      .text((d) => d.id);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance(width < 500 ? 55 : 100)
      )
      .force("charge", d3.forceManyBody().strength(width < 500 ? -130 : -260))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(nodeRadius * 2.2))
      .on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);
        node.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
        label.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
      });

    return () => {
      simulation.stop();
    };
  }, [graph, width, height, nodeRadius]);

  return <svg ref={svgRef} width="100%" height={height} viewBox={`0 0 ${width} ${height}`} />;
}
