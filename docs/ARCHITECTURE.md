# Arquitectura

## Filosofía de diseño

1. **Claude Code como motor de orquestación.** Los subagentes son archivos Markdown con frontmatter (`.claude/agents/*.md`), detectados y ejecutados nativamente por Claude Code, con contexto aislado por subagente.
2. **Memoria propia, no una dependencia de terceros.** `memory-engram` es una implementación propia (SQLite + embeddings locales), auditable y sin dependencias externas de pago.
3. **Obsidian como capa de memoria visible.** Un vault de Obsidian es solo una carpeta de Markdown — los agentes escriben ahí decisiones y research vía `obsidian-bridge`, navegable con el grafo nativo de Obsidian o con el grafo propio del dashboard.

## Componentes

### Orchestrator + subagentes
`orchestrator` descompone tareas y delega a `researcher`, `coder`, `docs-writer`, `memory-keeper`. Cada uno declara explícitamente sus herramientas permitidas (principio de menor privilegio).

### memory-engram
Servidor MCP con tools `remember`, `recall`, `forget`, `stats`. Storage: SQLite local. Embeddings: vectorizador local determinista (hashing trick + TF), sin costo ni red. Incluye deduplicación automática y la tabla `agent_events` que alimenta el dashboard.

**Detalle crítico de diseño:** la ruta por defecto de la base de datos se calcula relativa a la ubicación del propio archivo (`import.meta.url`), no a `process.cwd()`. Esto importa porque los hooks de Claude Code y el backend del dashboard invocan estos scripts desde distintos directorios de trabajo — depender de `process.cwd()` produce rutas inconsistentes según quién invoque.

### obsidian-bridge
Servidor MCP con tools `create_note`, `search_notes`, `get_backlinks`. Frontmatter YAML validado, protección contra path traversal, resolución de wikilinks.

### Hooks de Claude Code → dashboard
Claude Code pasa la información de los hooks (`agent_type`, `agent_prompt`, `hook_event_name`) como **JSON por stdin** al comando configurado, no como variables de entorno. `hook-log-event.js` lee ese JSON y lo traduce a filas en `agent_events`.

### Dashboard
- Backend (Node.js + Express + `ws`): expone REST + WebSocket, con polling simple sobre SQLite y lectura directa del vault (sin pasar por MCP, ya que ambos son solo lectura de archivos).
- Frontend (React + Vite + D3): tarjetas de agentes con tira de estado, panel de memoria, grafo interactivo con modal de pantalla completa, feed de actividad.

## Flujo típico

1. Usuario da una tarea al `orchestrator`.
2. `orchestrator` delega a los subagentes necesarios.
3. Los subagentes consultan Context7 para documentación de librerías actualizada.
4. `memory-keeper` decide qué persistir en `memory-engram`; `docs-writer` documenta en el vault vía `obsidian-bridge`.
5. Los hooks `SubagentStart`/`SubagentStop` alimentan `agent_events`, y el dashboard lo refleja en vivo.
