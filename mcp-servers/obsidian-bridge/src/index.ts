#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Vault } from "./vault.js";

const VAULT_PATH = process.env.VAULT_PATH || "../../vault-demo";
const vault = new Vault(VAULT_PATH);

const server = new Server(
  { name: "obsidian-bridge", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const CreateNoteSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
  frontmatter: z
    .object({
      date: z.string().optional(),
      tags: z.array(z.string()).optional(),
      source: z.string().optional(),
    })
    .optional(),
});

const SearchNotesSchema = z.object({
  query: z.string().default(""),
  tags: z.array(z.string()).optional(),
});

const GetBacklinksSchema = z.object({
  note: z.string().min(1),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "create_note",
      description: "Crea o sobreescribe una nota en el vault, con frontmatter YAML validado.",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
          frontmatter: {
            type: "object",
            properties: {
              date: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              source: { type: "string" },
            },
          },
        },
        required: ["path", "content"],
      },
    },
    {
      name: "search_notes",
      description: "Busca notas del vault por contenido/titulo y opcionalmente por tags.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
    },
    {
      name: "get_backlinks",
      description: "Lista que notas enlazan (via [[wikilink]]) a una nota dada, por su titulo.",
      inputSchema: {
        type: "object",
        properties: { note: { type: "string" } },
        required: ["note"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_note": {
        const input = CreateNoteSchema.parse(args);
        const result = vault.createNote({
          notePath: input.path,
          content: input.content,
          frontmatter: input.frontmatter,
        });
        return {
          content: [
            {
              type: "text",
              text: result.created ? `Nota creada en ${result.path}.` : `Nota existente en ${result.path} fue sobreescrita.`,
            },
          ],
        };
      }
      case "search_notes": {
        const input = SearchNotesSchema.parse(args);
        const matches = vault.searchNotes(input.query, input.tags);
        if (matches.length === 0) {
          return { content: [{ type: "text", text: "No se encontraron notas que coincidan." }] };
        }
        const formatted = matches
          .map((m) => `- ${m.path} [tags: ${m.tags.join(", ") || "sin tags"}]\n  "${m.excerpt}..."`)
          .join("\n");
        return { content: [{ type: "text", text: formatted }] };
      }
      case "get_backlinks": {
        const input = GetBacklinksSchema.parse(args);
        const backlinks = vault.getBacklinks(input.note);
        if (backlinks.length === 0) {
          return { content: [{ type: "text", text: `Ninguna nota enlaza a "${input.note}" todavia.` }] };
        }
        const formatted = backlinks.map((b) => `- ${b.title} (${b.path})`).join("\n");
        return { content: [{ type: "text", text: formatted }] };
      }
      default:
        throw new Error(`Tool desconocida: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`obsidian-bridge MCP server corriendo (stdio). Vault: ${VAULT_PATH}`);
}

main().catch((err) => {
  console.error("Fallo al iniciar obsidian-bridge:", err);
  process.exit(1);
});
