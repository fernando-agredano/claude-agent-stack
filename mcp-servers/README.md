# MCP servers

- **Context7** — servidor remoto oficial (Upstash), configurado directamente en `.claude/settings.json`. No requiere mantenimiento propio.
- **memory-engram/** — servidor propio de memoria persistente. Node.js/TypeScript + SQLite + embeddings locales.
- **obsidian-bridge/** — servidor propio para operaciones estructuradas sobre el vault de Obsidian. Node.js/TypeScript.

Ambos ya están registrados en `.claude/settings.json`. Solo necesitas `npm install && npm run build` dentro de cada carpeta (o correr `scripts/setup.sh` desde la raíz).
