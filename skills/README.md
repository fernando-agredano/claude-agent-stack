# Skills

Cada carpeta aquí es una "skill": un conjunto de instrucciones + metadata en un archivo `SKILL.md` que Claude Code puede leer antes de ejecutar una tarea relacionada.

## Convención

```
skills/
└── nombre-de-la-skill/
    └── SKILL.md   # frontmatter con "description" + instrucciones en el cuerpo
```

## Cómo agregar una nueva

1. Crea `skills/tu-skill/SKILL.md`.
2. Escribe una `description` que deje claro el trigger.
3. Documenta el proceso paso a paso en el cuerpo.
