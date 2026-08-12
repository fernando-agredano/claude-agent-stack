#!/usr/bin/env bash
set -euo pipefail

echo "==> Claude Agent Stack — setup"

if command -v nvm &> /dev/null && [ -f .nvmrc ]; then
  echo "ℹ️  Detectado .nvmrc — si usas nvm, corre 'nvm use' antes de este script para evitar problemas de módulos nativos (better-sqlite3)."
fi

if ! command -v claude &> /dev/null; then
  echo "⚠️  No se encontró 'claude' (Claude Code) en tu PATH."
  echo "    Instálalo desde https://claude.com/product/claude-code antes de continuar."
else
  echo "✅ Claude Code detectado: $(claude --version 2>/dev/null || echo 'versión no disponible')"
fi

echo ""
echo "==> Instalando y compilando servidores MCP propios (memory-engram, obsidian-bridge)"
if command -v node &> /dev/null; then
  (cd mcp-servers/memory-engram && npm install && npm run build)
  echo "✅ memory-engram listo (mcp-servers/memory-engram/dist/index.js)"
  (cd mcp-servers/obsidian-bridge && npm install && npm run build)
  echo "✅ obsidian-bridge listo (mcp-servers/obsidian-bridge/dist/index.js)"

  echo ""
  echo "==> Instalando el dashboard (backend + cliente React)"
  (cd dashboard/server && npm install && npm run build)
  (cd dashboard/client && npm install)
  echo "✅ dashboard listo — ver dashboard/README.md para correrlo (dos terminales)"
else
  echo "⚠️  No se encontró Node.js. Instala Node 18+ y corre manualmente:"
  echo "    cd mcp-servers/memory-engram && npm install && npm run build"
  echo "    cd mcp-servers/obsidian-bridge && npm install && npm run build"
  echo "    cd dashboard/server && npm install && npm run build"
  echo "    cd dashboard/client && npm install"
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo "ℹ️  Creado .env (vacío) por si luego quieres el modo API — no es necesario si usas tu sesión de Claude Code."
else
  echo "ℹ️  .env ya existe, no se sobreescribe."
fi

echo ""
echo "Listo. Corre 'claude' dentro de esta carpeta para empezar."
