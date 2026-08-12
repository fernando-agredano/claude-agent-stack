import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type VaultGraphNode = {
  id: string;
  folder: string;
  tags: string[];
};

export type VaultGraphLink = {
  source: string;
  target: string;
};

export type VaultStats = {
  totalNotes: number;
  folders: { folder: string; count: number }[];
};

const WIKILINK_PATTERN = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;

function listAllNotes(vaultRoot: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(vaultRoot)) return results;

  const walk = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".obsidian" || entry.name === ".trash") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(fullPath);
      }
    }
  };

  walk(vaultRoot);
  return results;
}

/**
 * Lee el vault directamente del sistema de archivos (no via MCP - obsidian-bridge
 * y este lector son procesos Node separados, asi que se duplica esta logica
 * de solo-lectura en vez de intentar compartir un modulo entre dos paquetes npm).
 */
export function getVaultGraph(vaultRoot: string): { nodes: VaultGraphNode[]; links: VaultGraphLink[] } {
  const notes = listAllNotes(vaultRoot);
  const titleToId = new Map<string, string>();
  const nodes: VaultGraphNode[] = [];

  for (const notePath of notes) {
    const raw = fs.readFileSync(notePath, "utf-8");
    const parsed = matter(raw);
    const title = path.basename(notePath, ".md");
    const relativeDir = path.dirname(path.relative(vaultRoot, notePath));
    const folder = relativeDir === "." ? "raiz" : relativeDir.split(path.sep)[0];
    const tags = (parsed.data.tags as string[] | undefined) ?? [];

    titleToId.set(title.toLowerCase(), title);
    nodes.push({ id: title, folder, tags });
  }

  const links: VaultGraphLink[] = [];
  const seenLinks = new Set<string>();

  for (const notePath of notes) {
    const raw = fs.readFileSync(notePath, "utf-8");
    const parsed = matter(raw);
    const sourceTitle = path.basename(notePath, ".md");

    let match: RegExpExecArray | null;
    WIKILINK_PATTERN.lastIndex = 0;
    while ((match = WIKILINK_PATTERN.exec(parsed.content)) !== null) {
      const targetRaw = match[1].trim();
      const targetTitle = titleToId.get(targetRaw.toLowerCase());
      if (!targetTitle || targetTitle === sourceTitle) continue;

      const key = `${sourceTitle}=>${targetTitle}`;
      if (seenLinks.has(key)) continue;
      seenLinks.add(key);
      links.push({ source: sourceTitle, target: targetTitle });
    }
  }

  return { nodes, links };
}

export function getVaultStats(vaultRoot: string): VaultStats {
  const notes = listAllNotes(vaultRoot);
  const folderCounts = new Map<string, number>();

  for (const notePath of notes) {
    const relativeDir = path.dirname(path.relative(vaultRoot, notePath));
    const folder = relativeDir === "." ? "raiz" : relativeDir.split(path.sep)[0];
    folderCounts.set(folder, (folderCounts.get(folder) ?? 0) + 1);
  }

  return {
    totalNotes: notes.length,
    folders: [...folderCounts.entries()].map(([folder, count]) => ({ folder, count })),
  };
}
