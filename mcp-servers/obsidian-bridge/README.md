# obsidian-bridge

Servidor MCP para trabajar con el vault de Obsidian del proyecto (`vault-demo/` por defecto), con frontmatter validado, wikilinks y protección contra path traversal.

## Instalación

```bash
npm install
npm run build
```

## Probarlo por tu cuenta

```bash
npm test
```

## Tools que expone

| Tool | Qué hace |
|---|---|
| `create_note(path, content, frontmatter?)` | Crea o sobreescribe una nota, con frontmatter YAML válido |
| `search_notes(query, tags?)` | Busca por contenido/título y opcionalmente filtra por tags |
| `get_backlinks(note)` | Lista qué notas enlazan a una nota dada |

## Configuración

`VAULT_PATH` apunta a la carpeta del vault. Ya está configurado en `.claude/settings.json`.

## Nota sobre el grafo del dashboard

El backend del dashboard (`dashboard/server`) **no** llama a este servidor MCP para el grafo visual — implementa su propia lectura de archivos equivalente (`getVaultGraph`), porque son dos procesos Node independientes y no vale la pena compartir el protocolo MCP solo para eso. Si cambias el formato de wikilinks o frontmatter aquí, revisa también `dashboard/server/src/vault-reader.ts`.
