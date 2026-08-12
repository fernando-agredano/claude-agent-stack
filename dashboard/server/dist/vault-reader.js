import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
const WIKILINK_PATTERN = /\[\[([^\]|]+)(\|[^\]]+)?\]\]/g;
function listAllNotes(vaultRoot) {
    const results = [];
    if (!fs.existsSync(vaultRoot))
        return results;
    const walk = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === ".obsidian" || entry.name === ".trash")
                continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else if (entry.isFile() && entry.name.endsWith(".md")) {
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
export function getVaultGraph(vaultRoot) {
    const notes = listAllNotes(vaultRoot);
    const titleToId = new Map();
    const nodes = [];
    for (const notePath of notes) {
        const raw = fs.readFileSync(notePath, "utf-8");
        const parsed = matter(raw);
        const title = path.basename(notePath, ".md");
        const relativeDir = path.dirname(path.relative(vaultRoot, notePath));
        const folder = relativeDir === "." ? "raiz" : relativeDir.split(path.sep)[0];
        const tags = parsed.data.tags ?? [];
        titleToId.set(title.toLowerCase(), title);
        nodes.push({ id: title, folder, tags });
    }
    const links = [];
    const seenLinks = new Set();
    for (const notePath of notes) {
        const raw = fs.readFileSync(notePath, "utf-8");
        const parsed = matter(raw);
        const sourceTitle = path.basename(notePath, ".md");
        let match;
        WIKILINK_PATTERN.lastIndex = 0;
        while ((match = WIKILINK_PATTERN.exec(parsed.content)) !== null) {
            const targetRaw = match[1].trim();
            const targetTitle = titleToId.get(targetRaw.toLowerCase());
            if (!targetTitle || targetTitle === sourceTitle)
                continue;
            const key = `${sourceTitle}=>${targetTitle}`;
            if (seenLinks.has(key))
                continue;
            seenLinks.add(key);
            links.push({ source: sourceTitle, target: targetTitle });
        }
    }
    return { nodes, links };
}
export function getVaultStats(vaultRoot) {
    const notes = listAllNotes(vaultRoot);
    const folderCounts = new Map();
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
//# sourceMappingURL=vault-reader.js.map