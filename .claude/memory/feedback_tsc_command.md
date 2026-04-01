---
name: Validação TypeScript client/web
description: npx tsc neste shell aponta pro pacote errado; usar o binário local do projeto
type: feedback
---

Usar sempre o binário local para validar TypeScript em `client/web`:

```bash
"C:/Users/hedge/OneDrive/Desktop/pokém/client/web/node_modules/.bin/tsc.cmd" --noEmit
```

**Why:** `npx tsc` no shell desta sessão resolve pro TypeScript errado (não o do projeto).
**How to apply:** Toda vez que precisar rodar `tsc --noEmit` em `client/web`, usar o caminho acima.
