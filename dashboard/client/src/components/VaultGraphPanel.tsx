import { useState } from "react";
import { ForceGraph } from "./ForceGraph";
import type { VaultGraph } from "../types";

export function VaultGraphPanel({ graph }: { graph: VaultGraph }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">Grafo del vault (obsidian-bridge)</span>
        <button className="icon-btn" onClick={() => setExpanded(true)} aria-label="Ampliar grafo">
          ⤢
        </button>
      </div>

      <div className="graph-box">
        {graph.nodes.length === 0 ? (
          <p className="empty-hint">Sin notas todavia. Crea una desde Claude Code o Obsidian.</p>
        ) : (
          <ForceGraph graph={graph} width={340} height={220} nodeRadius={7} />
        )}
        <Legend />
      </div>

      {expanded && (
        <div className="modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-card__header">
              <span className="panel__title" style={{ fontSize: 15 }}>Grafo del vault — vista ampliada</span>
              <button className="icon-btn" onClick={() => setExpanded(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <ForceGraph graph={graph} width={900} height={620} nodeRadius={10} />
            <Legend />
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span><span className="legend__dot" style={{ background: "var(--folder-agents)" }} />Agents</span>
      <span><span className="legend__dot" style={{ background: "var(--folder-inbox)" }} />00-Inbox</span>
    </div>
  );
}
