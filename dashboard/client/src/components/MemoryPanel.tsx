import type { MemoryItem } from "../types";

export function MemoryPanel({ memories }: { memories: MemoryItem[] }) {
  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">Memoria (memory-engram)</span>
      </div>

      {memories.length === 0 ? (
        <p className="empty-hint">Sin recuerdos guardados todavia.</p>
      ) : (
        <div className="memory-list">
          {memories.slice(0, 5).map((m) => (
            <div key={m.id} className="memory-item">
              <div className="memory-item__row">
                <span className="memory-item__text">{m.text}</span>
                <span className="memory-item__importance">Imp {m.importance}</span>
              </div>
              <div className="memory-item__bar-track">
                <div className="memory-item__bar-fill" style={{ width: `${m.importance * 10}%` }} />
              </div>
              {m.tags.length > 0 && (
                <div className="memory-item__tags">
                  {m.tags.map((tag) => (
                    <span key={tag} className="tag-pill">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
