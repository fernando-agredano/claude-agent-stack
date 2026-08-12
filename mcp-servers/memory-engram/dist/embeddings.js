const VECTOR_SIZE = 256;
function tokenize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}
function hashToken(token) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < token.length; i++) {
        hash ^= token.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return Math.abs(hash) % VECTOR_SIZE;
}
export class LocalEmbeddingProvider {
    embed(text) {
        const vector = new Array(VECTOR_SIZE).fill(0);
        const tokens = tokenize(text);
        for (const token of tokens) {
            const idx = hashToken(token);
            vector[idx] += 1;
        }
        const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
        return vector.map((v) => v / norm);
    }
}
export function cosineSimilarity(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
    }
    return dot;
}
export function getEmbeddingProvider(name = "local") {
    switch (name) {
        case "local":
            return new LocalEmbeddingProvider();
        default:
            throw new Error(`Embedding provider "${name}" no implementado todavia. Usa "local", o implementa uno nuevo en src/embeddings.ts.`);
    }
}
//# sourceMappingURL=embeddings.js.map