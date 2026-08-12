import fs from "node:fs";
import path from "node:path";
import assert from "node:assert";
import { Vault } from "../src/vault.js";

const TEST_VAULT = path.join(process.cwd(), "test", ".tmp-vault");

if (fs.existsSync(TEST_VAULT)) fs.rmSync(TEST_VAULT, { recursive: true, force: true });

const vault = new Vault(TEST_VAULT);

console.log("1) createNote() crea una nota con frontmatter...");
const r1 = vault.createNote({
  notePath: "Agents/decision-stack.md",
  content: "El stack usa Node.js y TypeScript para los servidores MCP.",
  frontmatter: { tags: ["stack", "decision"], source: "coder" },
});
assert.strictEqual(r1.created, true);
console.log("   OK:", r1.path);

console.log("2) createNote() sobre la misma ruta la sobreescribe...");
const r2 = vault.createNote({
  notePath: "Agents/decision-stack.md",
  content: "Contenido actualizado.",
  frontmatter: { tags: ["stack"] },
});
assert.strictEqual(r2.created, false);
console.log("   OK");

console.log("3) createNote() rechaza path traversal...");
assert.throws(() => {
  vault.createNote({ notePath: "../../fuera-del-vault", content: "malo" });
});
console.log("   OK, bloqueado");

console.log("4) Creamos una nota que enlaza a la primera con [[wikilink]]...");
vault.createNote({
  notePath: "00-Inbox/nota-relacionada.md",
  content: "Esto se relaciona con [[decision-stack]] y su justificacion.",
  frontmatter: { tags: ["inbox"] },
});
console.log("   OK");

console.log("5) searchNotes() encuentra por contenido...");
const found = vault.searchNotes("actualizado");
assert.strictEqual(found.length, 1);
console.log("   OK:", found[0].path);

console.log("6) searchNotes() filtra por tags...");
const foundByTag = vault.searchNotes("", ["inbox"]);
assert.strictEqual(foundByTag.length, 1);
console.log("   OK:", foundByTag[0].path);

console.log("7) getBacklinks() encuentra la nota que enlaza...");
const backlinks = vault.getBacklinks("decision-stack");
assert.strictEqual(backlinks.length, 1);
assert.strictEqual(backlinks[0].title, "nota-relacionada");
console.log("   OK:", backlinks[0].title);

console.log("8) getGraphData() devuelve 2 nodos y 1 link...");
const graph = vault.getGraphData();
assert.strictEqual(graph.nodes.length, 2);
assert.strictEqual(graph.links.length, 1);
assert.strictEqual(graph.links[0].source, "nota-relacionada");
assert.strictEqual(graph.links[0].target, "decision-stack");
console.log("   OK:", JSON.stringify(graph));

fs.rmSync(TEST_VAULT, { recursive: true, force: true });

console.log("\nTodos los tests de obsidian-bridge pasaron.");
