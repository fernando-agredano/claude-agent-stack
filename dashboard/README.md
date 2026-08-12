# Dashboard

Panel web en vivo: agentes trabajando, memoria persistente y grafo del vault de Obsidian. Backend en Node.js/Express/WebSocket, frontend en React (Vite) con D3 para el grafo.

## Cómo funciona

1. Los **hooks de Claude Code** (`.claude/settings.json → hooks.SubagentStart/SubagentStop`) ejecutan `memory-engram`'s `hook-log-event.js`, que lee el JSON que Claude Code manda por **stdin** (no por variables de entorno) y extrae `agent_type`/`agent_prompt`/`hook_event_name` para insertar una fila en `agent_events`.
2. El **backend** (`dashboard/server`) expone:
   - `GET /api/health` — chequeo de salud del backend
   - `GET /api/status` — estado actual por agente
   - `GET /api/events` — eventos crudos
   - `GET /api/summary` — contadores agregados (agentes, memorias, notas, eventos hoy)
   - `GET /api/analytics` — series de tiempo y agregados (actividad 24h, eventos por tipo/agente, duración promedio) para las gráficas del dashboard
   - `GET /api/memories` y `/api/memories/stats` — leídos directo de la tabla `memories` de `memory-engram`
   - `GET /api/vault/graph` y `/api/vault/stats` — leídos escaneando `vault-demo/` (frontmatter + wikilinks), sin pasar por MCP
   - `WS /ws` — push en vivo de cambios de estado de agentes
3. El **frontend** consume todo esto: tarjetas de agentes con historial expandible, panel de memoria con barra de importancia, grafo interactivo (arrastrable, con resaltado de conexiones al pasar el cursor) con un botón para expandirlo a un modal de pantalla completa, y un feed de actividad tipo teletipo.

## Instalación

```bash
cd dashboard/server && npm install && npm run build && cd ../..
cd dashboard/client && npm install && cd ../..
```

## Correrlo

Dos terminales:

```bash
# Terminal 1
cd dashboard/server
npm run dev
# http://localhost:4000

# Terminal 2
cd dashboard/client
npm run dev
# http://localhost:5173
```

Abre `http://localhost:5173`.

## Probarlo sin Claude Code

```bash
node mcp-servers/memory-engram/dist/log-event.js coder started "prueba manual"
```

## Pruebas automatizadas

```bash
cd dashboard/server && npm test
```

Levanta el servidor real como proceso hijo, crea un vault y una memoria de prueba, e inserta eventos — valida REST + WebSocket + lectura del vault + lectura de memoria, todo end-to-end.

## Configuración

| Variable | Default | Qué hace |
|---|---|---|
| `DASHBOARD_PORT` | `4000` | Puerto del backend |
| `DASHBOARD_POLL_INTERVAL_MS` | `1000` | Cada cuánto revisa eventos nuevos |
| `MEMORY_DB_PATH` | (calculado relativo al proyecto) | Ruta a la SQLite de memory-engram |
| `VAULT_PATH` | (calculado relativo al proyecto) | Ruta al vault de Obsidian |
