# memory-engram

Servidor MCP propio de memoria persistente. Node.js + TypeScript, SQLite local, embeddings locales sin dependencias externas ni API keys.

## Instalación

```bash
npm install
npm run build
```

## Probarlo por tu cuenta (sin Claude Code)

```bash
npm test   # smoke test: remember/recall/forget/stats/listAll end-to-end
```

## Tools que expone (via MCP)

| Tool | Qué hace |
|---|---|
| `remember(text, tags?, importance?)` | Guarda un hecho/decisión. Deduplica automáticamente. |
| `recall(query, limit?)` | Búsqueda por similitud sobre lo guardado. |
| `forget(id)` | Elimina una memoria específica. |
| `stats()` | Total de memorias, tags más usados, importancia promedio. |

## Scripts de línea de comandos

- `dist/log-event.js <agent> <started|finished|error|task_assigned> [detalle]` — para pruebas manuales.
- `dist/hook-log-event.js` — el que usan los **hooks reales de Claude Code** (`.claude/settings.json`). Lee el JSON que Claude Code manda por stdin (`hook_event_name`, `agent_type`, `agent_prompt`), no variables de entorno.
- `npm run clean` — borra `data/` para reiniciar la memoria desde cero.

## Diseño de la ruta de datos

La ruta por defecto de la base SQLite (`data/memory.db`) se calcula relativa a la ubicación del propio archivo compilado, no a `process.cwd()`. Esto es importante: los hooks de Claude Code se ejecutan con el directorio de trabajo del proyecto raíz, no desde esta carpeta, así que depender de `process.cwd()` escribiría en el lugar equivocado. Puedes sobreescribir con `MEMORY_DB_PATH` si lo necesitas.
