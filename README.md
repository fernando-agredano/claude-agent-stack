# Claude Agent Stack

A complete development stack for orchestrating AI agents with **Claude Code**: orchestrator + specialized subagents, its own persistent memory, integration with **Obsidian**, reusable **skills**, **MCP** servers (including **Context7**), and a **live dashboard** with an interactive vault graph and memory panel.

## Table of Contents

- [What It Includes](#what-it-includes)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [The Dashboard](#the-dashboard)
- [Configuration](#configuration)
- [Optional API Key Usage](#optional-api-key-usage)
- [Repository Structure](#repository-structure)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)

## What It Includes

| Component | Technology | Status |
|---|---|---|
| Orchestrator + 4 subagents | Native Claude Code (`.claude/agents/*.md`) | ✅ |
| `memory-engram` | Node.js + TypeScript + SQLite | ✅ tested |
| `obsidian-bridge` | Node.js + TypeScript | ✅ tested |
| Example Obsidian vault | Markdown | ✅ |
| Example skill | Markdown + YAML | ✅ |
| Context7 | Official remote MCP | ✅ configured |
| Dashboard (agents + memory + vault graph) | Node/Express/WebSocket + React + D3 | ✅ tested |

## Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | 18+ (20 recommended, see `.nvmrc`) | `node --version` |
| Claude Code | latest | `claude --version` |
| Git | any recent version | `git --version` |
| Obsidian (optional) | any | — |

If you already use Claude Code with a Pro/Max subscription, **that's all you need** to authenticate — no API key required.

> If you use `nvm`, run `nvm use` in the project root (there's an `.nvmrc`) **before** installing anything, and use the same terminal/version for all the steps — mixing Node versions across folders breaks native modules (`better-sqlite3`).

## Installation

```bash
git clone https://github.com/tu-usuario/claude-agent-stack.git
cd claude-agent-stack
bash scripts/setup.sh
```

This installs and builds `memory-engram`, `obsidian-bridge`, and the dashboard (backend + client). It doesn't ask for or need any credentials.

Then, in the same folder:

```bash
claude
```

With your session already authenticated, that's it. Claude Code automatically detects the subagents, the MCP servers (defined in `.mcp.json`, enabled via `enableAllProjectMcpServers` in `.claude/settings.json`), and the skills.

Verify the connection:

```
> What MCP servers do I have available?
```

You should see `context7`, `memory-engram`, and `obsidian-bridge`.

**Important:** if you edit `.claude/settings.json` while a Claude Code session is already open, you need to **exit (`/exit`) and reopen `claude`** for the changes to take effect — hooks are loaded when the session starts.

## Usage

```
> Use the orchestrator agent to research how rate
  limiting works in Express and document what you find in the vault
```

This triggers the full flow: `orchestrator` delegates to `researcher` (which queries Context7), then to `docs-writer` (which creates a note in the vault via `obsidian-bridge`).

Persistent memory:

```
> Remember that this project uses Node.js and TypeScript
> What technology does this project use?
```

## The Dashboard

![Dashboard overview: metrics, activity, and charts](public/preview-1.png)

![Agents, memory, and vault graph view](public/preview-2.png)

Two terminals:

```bash
# Terminal A
cd dashboard/server && npm run dev

# Terminal B
cd dashboard/client && npm run dev
```

Open `http://localhost:5173`. You'll see live: agent cards (click the arrow to view their history), a memory panel with an importance bar and tags, an interactive vault graph (drag the nodes, hover to highlight connections, click ⤢ to view it in full screen), and an activity feed.

Full details in [`dashboard/README.md`](dashboard/README.md).

## Configuration

Everything lives in `config/config.yaml` (no secrets) and `.env` (optional, see below). To add your own subagents or skills, copy an existing file in `.claude/agents/` or `skills/` and adjust the `description`.

## Optional API Key Usage

**This doesn't apply if you already use Claude Code with your subscription — skip this section.**

To run the orchestrator unattended (CI, server): copy `.env.example` to `.env`, fill in `ANTHROPIC_API_KEY`, and change `orchestration.engine` to `api` in `config/config.yaml`.

## Repository Structure

```
claude-agent-stack/
├── .claude/
│   ├── settings.json          # permissions + hooks + enableAllProjectMcpServers
│   └── agents/                # orchestrator, researcher, coder, docs-writer, memory-keeper
├── .mcp.json                   # MCP server definitions (context7, memory-engram, obsidian-bridge)
├── config/config.yaml          # project configuration (no secrets)
├── skills/example-skill/
├── mcp-servers/
│   ├── memory-engram/          # memory MCP server (Node.js/TS + SQLite)
│   └── obsidian-bridge/        # vault MCP server (Node.js/TS)
├── vault-demo/                 # example Obsidian vault
├── dashboard/
│   ├── server/                 # backend Express + WebSocket
│   └── client/                 # frontend React + D3
├── docs/ARCHITECTURE.md
└── scripts/setup.sh
```

## Troubleshooting

**"Claude Code doesn't detect the MCP servers"** — verify that you built both: `ls mcp-servers/memory-engram/dist` and `ls mcp-servers/obsidian-bridge/dist` should show `index.js`.

**"better-sqlite3 error on install / NODE_MODULE_VERSION mismatch"** — you installed with one Node version and are running with another. Run `nvm use` in the root before installing anything, and reinstall (`rm -rf node_modules package-lock.json && npm install`) in `mcp-servers/memory-engram`, `mcp-servers/obsidian-bridge`, and `dashboard/server` with that same version active.

**"I edited settings.json but nothing happens"** — restart the Claude Code session (`/exit` and reopen `claude`); hooks are only loaded at startup.

**"The dashboard doesn't show any agents"** — check `http://localhost:4000/api/health`. Generate a test event: `node mcp-servers/memory-engram/dist/log-event.js coder started "prueba"`.

**"The vault graph appears empty"** — make sure you have at least one `.md` note in `vault-demo/` with valid frontmatter; the panel updates every 8 seconds.

## Roadmap

- [x] Orchestrator + subagents + skills
- [x] `memory-engram` + `obsidian-bridge`, tested end-to-end
- [x] Complete dashboard: agents, memory, vault graph, full-screen modal

## License

MIT — see [`LICENSE`](LICENSE).
