#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { openDb } from "./db.js";
import { MemoryStore } from "./memory.js";

const EMBEDDINGS_PROVIDER = process.env.MEMORY_EMBEDDINGS_PROVIDER || "local";

const db = openDb();
const memory = new MemoryStore(db, EMBEDDINGS_PROVIDER);

const server = new Server(
  { name: "memory-engram", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const RememberSchema = z.object({
  text: z.string().min(1),
  tags: z.array(z.string()).optional(),
  importance: z.number().min(1).max(10).optional(),
});

const RecallSchema = z.object({
  query: z.string().min(1),
  limit: z.number().min(1).max(50).optional(),
});

const ForgetSchema = z.object({
  id: z.number(),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "remember",
      description:
        "Guarda un hecho o decision en memoria persistente de largo plazo. Usa esto solo para informacion reutilizable en sesiones futuras.",
      inputSchema: {
        type: "object",
        properties: {
          text: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          importance: { type: "number" },
        },
        required: ["text"],
      },
    },
    {
      name: "recall",
      description: "Busca memorias relevantes por similitud a una consulta.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
    {
      name: "forget",
      description: "Elimina una memoria especifica por su id.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "number" } },
        required: ["id"],
      },
    },
    {
      name: "stats",
      description: "Devuelve estadisticas generales de la memoria.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "remember": {
        const input = RememberSchema.parse(args);
        const result = memory.remember(input);
        return {
          content: [
            {
              type: "text",
              text: result.deduplicated
                ? `Ya existia una memoria muy similar (id ${result.id}); la actualice en vez de duplicarla.`
                : `Memoria guardada con id ${result.id}.`,
            },
          ],
        };
      }
      case "recall": {
        const input = RecallSchema.parse(args);
        const results = memory.recall(input.query, input.limit ?? 5);
        if (results.length === 0) {
          return { content: [{ type: "text", text: "No se encontraron memorias relevantes." }] };
        }
        const formatted = results
          .map(
            (m) =>
              `#${m.id} (score ${m.score.toFixed(2)}, importancia ${m.importance}): ${m.text} [tags: ${m.tags.join(", ") || "sin tags"}]`
          )
          .join("\n");
        return { content: [{ type: "text", text: formatted }] };
      }
      case "forget": {
        const input = ForgetSchema.parse(args);
        const deleted = memory.forget(input.id);
        return {
          content: [
            {
              type: "text",
              text: deleted ? `Memoria ${input.id} eliminada.` : `No se encontro memoria con id ${input.id}.`,
            },
          ],
        };
      }
      case "stats": {
        const s = memory.stats();
        const tagsText = s.topTags.map((t) => `${t.tag} (${t.count})`).join(", ") || "sin tags aun";
        return {
          content: [
            {
              type: "text",
              text: `Total de memorias: ${s.total}. Importancia promedio: ${s.avgImportance}. Tags mas usados: ${tagsText}.`,
            },
          ],
        };
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
  console.error("memory-engram MCP server corriendo (stdio).");
}

main().catch((err) => {
  console.error("Fallo al iniciar memory-engram:", err);
  process.exit(1);
});
