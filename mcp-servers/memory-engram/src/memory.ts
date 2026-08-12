import type Database from "better-sqlite3";
import { cosineSimilarity, getEmbeddingProvider, type EmbeddingProvider } from "./embeddings.js";
import type { MemoryRow } from "./db.js";

export type RememberInput = {
  text: string;
  tags?: string[];
  importance?: number;
};

export type RecalledMemory = {
  id: number;
  text: string;
  tags: string[];
  importance: number;
  score: number;
  created_at: string;
  updated_at: string;
};

export class MemoryStore {
  private db: Database.Database;
  private embedder: EmbeddingProvider;

  constructor(db: Database.Database, embeddingsProvider: string = "local") {
    this.db = db;
    this.embedder = getEmbeddingProvider(embeddingsProvider);
  }

  remember(input: RememberInput): { id: number; deduplicated: boolean } {
    const tags = input.tags ?? [];
    const importance = clamp(input.importance ?? 5, 1, 10);
    const embedding = this.embedder.embed(input.text);

    const existing = this.recall(input.text, 1)[0];
    if (existing && existing.score > 0.92) {
      const stmt = this.db.prepare(
        `UPDATE memories SET text = ?, tags = ?, importance = ?, embedding = ?, updated_at = datetime('now') WHERE id = ?`
      );
      stmt.run(input.text, JSON.stringify(tags), importance, JSON.stringify(embedding), existing.id);
      return { id: existing.id, deduplicated: true };
    }

    const stmt = this.db.prepare(
      `INSERT INTO memories (text, tags, importance, embedding) VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(input.text, JSON.stringify(tags), importance, JSON.stringify(embedding));
    return { id: Number(result.lastInsertRowid), deduplicated: false };
  }

  recall(query: string, limit: number = 5): RecalledMemory[] {
    const queryEmbedding = this.embedder.embed(query);
    const rows = this.db.prepare(`SELECT * FROM memories`).all() as MemoryRow[];

    const scored = rows.map((row) => {
      const embedding = JSON.parse(row.embedding) as number[];
      const score = cosineSimilarity(queryEmbedding, embedding);
      return {
        id: row.id,
        text: row.text,
        tags: JSON.parse(row.tags) as string[],
        importance: row.importance,
        score,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    scored.sort((a, b) => b.score + b.importance * 0.01 - (a.score + a.importance * 0.01));
    return scored.slice(0, limit).filter((m) => m.score > 0.05);
  }

  forget(id: number): boolean {
    const stmt = this.db.prepare(`DELETE FROM memories WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  listAll(limit: number = 50): RecalledMemory[] {
    const rows = this.db
      .prepare(`SELECT * FROM memories ORDER BY updated_at DESC LIMIT ?`)
      .all(limit) as MemoryRow[];

    return rows.map((row) => ({
      id: row.id,
      text: row.text,
      tags: JSON.parse(row.tags) as string[],
      importance: row.importance,
      score: 1,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  stats(): { total: number; topTags: { tag: string; count: number }[]; avgImportance: number } {
    const rows = this.db.prepare(`SELECT tags, importance FROM memories`).all() as {
      tags: string;
      importance: number;
    }[];

    const tagCounts = new Map<string, number>();
    let importanceSum = 0;

    for (const row of rows) {
      importanceSum += row.importance;
      const tags = JSON.parse(row.tags) as string[];
      for (const tag of tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const topTags = [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: rows.length,
      topTags,
      avgImportance: rows.length > 0 ? Number((importanceSum / rows.length).toFixed(2)) : 0,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
