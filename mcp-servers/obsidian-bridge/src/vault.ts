import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type NoteFrontmatter = {
  date?: string;
  tags?: string[];
  source?: string;
  [key: string]: unknown;
};

export type CreateNoteInput = {
  notePath: string;
  content: string;
  frontmatter?: NoteFrontmatter;
};

export type NoteMatch = {
  path: string;
  title: string;
  excerpt: string;
  tags: string[];
};

export type GraphNode = {
  id: string;
  folder: string;
  tags: string[];
};

export type GraphLink = {
  source: string;
  target: string;
};

export class VaultError extends Error {}

const WIKILINK_PATTERN = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;

export class Vault {
  private root: string;

  constructor(vaultPath: string) {
    this.root = path.resolve(vaultPath);
    if (!fs.existsSync(this.root)) {
      fs.mkdirSync(this.root, { recursive: true });
    }
  }

  private resolveSafe(relativePath: string): string {
    const normalized = relativePath.endsWith(".md") ? relativePath : `${relativePath}.md`;
    const resolved = path.resolve(this.root, normalized);
    if (!resolved.startsWith(this.root)) {
      throw new VaultError(`Ruta fuera del vault no permitida: ${relativePath}`);
    }
    return resolved;
  }

  createNote(input: CreateNoteInput): { path: string; created: boolean } {
    const fullPath = this.resolveSafe(input.notePath);
    const alreadyExists = fs.existsSync(fullPath);

    const frontmatter: NoteFrontmatter = {
      date: input.frontmatter?.date ?? new Date().toISOString().slice(0, 10),
      tags: input.frontmatter?.tags ?? [],
      source: input.frontmatter?.source ?? "agent",
      ...input.frontmatter,
    };

    const fileContent = matter.stringify(input.content, frontmatter);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, fileContent, "utf-8");

    return { path: path.relative(this.root, fullPath), created: !alreadyExists };
  }

  private listAllNotes(): string[] {
    const results: string[] = [];

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

    if (fs.existsSync(this.root)) walk(this.root);
    return results;
  }

  searchNotes(query: string, tags?: string[]): NoteMatch[] {
    const lowerQuery = query.toLowerCase();
    const notes = this.listAllNotes();
    const matches: NoteMatch[] = [];

    for (const notePath of notes) {
      const raw = fs.readFileSync(notePath, "utf-8");
      const parsed = matter(raw);
      const noteTags = (parsed.data.tags as string[] | undefined) ?? [];

      if (tags && tags.length > 0) {
        const hasAllTags = tags.every((t) => noteTags.includes(t));
        if (!hasAllTags) continue;
      }

      const contentLower = parsed.content.toLowerCase();
      const titleFromFile = path.basename(notePath, ".md");

      if (query.trim() === "" || contentLower.includes(lowerQuery) || titleFromFile.toLowerCase().includes(lowerQuery)) {
        const idx = contentLower.indexOf(lowerQuery);
        const excerpt =
          idx >= 0
            ? parsed.content.slice(Math.max(0, idx - 40), idx + 120).trim()
            : parsed.content.slice(0, 120).trim();

        matches.push({
          path: path.relative(this.root, notePath),
          title: titleFromFile,
          excerpt,
          tags: noteTags,
        });
      }
    }

    return matches;
  }

  getBacklinks(noteTitle: string): { path: string; title: string }[] {
    const notes = this.listAllNotes();
    const linkPattern = new RegExp(`\\[\\[${escapeRegExp(noteTitle)}(\\|[^\\]]+)?\\]\\]`, "i");
    const backlinks: { path: string; title: string }[] = [];

    for (const notePath of notes) {
      const title = path.basename(notePath, ".md");
      if (title.toLowerCase() === noteTitle.toLowerCase()) continue;

      const raw = fs.readFileSync(notePath, "utf-8");
      const parsed = matter(raw);

      if (linkPattern.test(parsed.content)) {
        backlinks.push({ path: path.relative(this.root, notePath), title });
      }
    }

    return backlinks;
  }

  /**
   * Escanea todo el vault y devuelve nodos (una nota = un nodo, con su
   * carpeta y tags) y links (wikilinks resueltos entre notas existentes).
   * Pensado para que el dashboard construya un grafo visual sin depender
   * del protocolo MCP - es solo lectura de archivos.
   */
  getGraphData(): { nodes: GraphNode[]; links: GraphLink[] } {
    const notes = this.listAllNotes();
    const titleToId = new Map<string, string>();
    const nodes: GraphNode[] = [];

    for (const notePath of notes) {
      const raw = fs.readFileSync(notePath, "utf-8");
      const parsed = matter(raw);
      const title = path.basename(notePath, ".md");
      const relativeDir = path.dirname(path.relative(this.root, notePath));
      const folder = relativeDir === "." ? "raiz" : relativeDir.split(path.sep)[0];
      const tags = (parsed.data.tags as string[] | undefined) ?? [];

      titleToId.set(title.toLowerCase(), title);
      nodes.push({ id: title, folder, tags });
    }

    const links: GraphLink[] = [];
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
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
