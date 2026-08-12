---
name: nueva-nota-vault
description: Usa esta skill cuando el usuario pida crear o actualizar una nota en el vault de Obsidian del proyecto (vault-demo/), por ejemplo "guarda esto en el vault", "crea una nota sobre X", "documenta esta decisión en Obsidian".
---

# Crear/actualizar una nota en el vault

## Herramienta a usar

No escribas el archivo a mano: usa las tools del servidor MCP `obsidian-bridge`:
- `create_note(path, content, frontmatter)` — crea la nota con frontmatter YAML válido automáticamente.
- `search_notes(query, tags?)` — revisa si ya existe algo similar antes de crear.
- `get_backlinks(note)` — para ver qué otras notas ya referencian el tema.

## Convenciones del vault

1. Ubicación: notas rápidas → `00-Inbox/`; notas sobre agentes/decisiones → `Agents/`.
2. `create_note` ya completa `date`, `tags` y `source` por defecto.
3. Enlaza conceptos existentes con `[[Nombre de la nota]]` en vez de repetir información.
4. Preferir notas cortas y enlazadas sobre una nota larga que mezcle temas.

## Pasos

1. Determina la carpeta correcta.
2. Usa `search_notes` para revisar duplicados.
3. Llama a `create_note` con la ruta, contenido y tags.
4. Si es relevante para memoria de largo plazo, avisa al `memory-keeper`.
