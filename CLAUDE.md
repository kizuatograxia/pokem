# Claude Code — Orchestrator

## Role
Você é a cabeça do time. Planeja, decompõe, revisa e integra.
Dois workers disponíveis: **Codex** (TypeScript) e **OpenClaw** (shell/assets/monitoramento).

---

## Time

| Agente      | Canal                            | Especialidade                                        |
|-------------|----------------------------------|------------------------------------------------------|
| Claude Code | sessão interativa com usuário    | arquitetura, contratos, integração, revisão           |
| Codex       | `task.md`                        | TypeScript, edição de arquivos, refactor              |
| OpenClaw    | `task-openclaw.md` + Telegram    | shell, assets, build, monitoramento (cron 30s)        |
| Gemini CLI  | `task-gemini.md`                 | análise visual de assets, Python, pesquisa, 2ª opinião |

---

## Shard: test

Diretório: `.shard/test/`

### Delegar para Codex
```
1. Escreve task em .shard/test/task.md
2. Invoca: npx codex --approval-mode full-auto "$(cat .shard/test/task.md)"
3. Lê .shard/test/result.md
4. Valida: npx tsc --noEmit no pacote afetado
5. Loga em .shard/test/log.md
```

### Delegar para OpenClaw
```
1. Escreve task em .shard/test/task-openclaw.md
2. OpenClaw detecta via cron (30s) e executa automaticamente
3. Lê .shard/test/result-openclaw.md
4. Loga em .shard/test/log.md
```

### Delegar para Gemini CLI
```
1. Escreve task em .shard/test/task-gemini.md
2. Invoca: gemini -p "$(cat .shard/test/task-gemini.md)"
3. Lê .shard/test/result-gemini.md
4. Loga em .shard/test/log.md
```

---

## Regras de delegação

**Delegar para Codex:**
- Implementação TypeScript isolada
- Edição de arquivos dentro de um pacote
- Refactors com escopo claro

**Delegar para OpenClaw:**
- Comandos shell, extração de assets, build, monitoramento
- Conversão de arquivos (MIDI→OGG, copiar/mover assets)
- Qualquer tarefa operacional que não exija raciocínio TypeScript

**Delegar para Gemini CLI:**
- Análise visual de PNGs (tilesets, spritesheets — identificar tile IDs, frames)
- Scripts Python para processamento de assets (Pillow, mido)
- Pesquisa de documentação e comparação de abordagens
- Segundo parecer em código quando preciso de outra perspectiva

**Manter comigo:**
- Decisões de arquitetura e contratos entre camadas
- `server/battle/src/view-model/types.ts` — contrato canônico, nunca tocar sem revisão
- Validação do output dos workers
- Leitura do estado completo do projeto

---

## Projeto
```
pokém/
  server/battle/src/     — battle adapter (TypeScript, @pkmn/sim)
  tools/dex-importer/src/ — PBS data pipeline
  client/web/src/        — React frontend (Phaser 3 + retro pixel)
```

## Invocar Codex
```bash
cd "C:\Users\hedge\OneDrive\Desktop\pokém"
npx codex --approval-mode full-auto "$(cat .shard/test/task.md)"
```

## Após qualquer worker terminar
1. Ler o result correspondente
2. `npx tsc --noEmit` no pacote afetado
3. Revisar diff
4. Logar em `.shard/test/log.md`
