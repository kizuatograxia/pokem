---
tags:
  - backlog
  - parity
  - gaps
status: active
---

# Essentials Parity Gap Register

## Como usar

- um item por gap concreto
- classificar severidade (P0/P1/P2)
- marcar estado: `open`, `in-progress`, `validated`, `deferred`
- anexar evidencia (arquivo, screenshot, teste)

## Matriz de gaps

| ID | Area | Gap | Severidade | Estado | Evidencia | Proximo passo |
|---|---|---|---|---|---|---|
| PAR-001 | UI | Windowskin 9-patch real ainda em implementacao final no `client/web` | P1 | open | `.shard/test/task.md` | concluir `PkeWindow` + validar screenshot comparativo |
| PAR-002 | UI | Escala/resolucao entre UI (512x384) e Hub Phaser (640x480) ainda nao padronizada | P1 | open | `07 Sessions/2026-03-31...` | definir politica unica de viewport e aplicar |
| PAR-003 | UI/Flow | Fluxos PC/storage avancados (submenu completo Summary/Mark/Release etc.) ainda parciais | P1 | in-progress | `.shard/test/result.md` | fechar comandos faltantes + testes de paridade |
| PAR-004 | Data | Ownership PBS base vs Gen9 ainda sem tabela canonica fechada | P0 | open | `09 Backlog/Near-Term Execution Plan` | inventario PBS + tabela de overrides |
| PAR-005 | Battle | Contrato autoritativo (estado/comandos/eventos) ainda nao formalizado em artefato unico | P0 | open | `09 Backlog/Near-Term Execution Plan` | publicar nota de contrato v0 |
| PAR-006 | Battle | Suite de fixtures comparativas Essentials vs runtime novo ainda inexistente | P0 | open | n/a | criar harness de comparacao e casos seed |
| PAR-007 | Ops | Gateway OpenClaw intermitente impacta automacao de tasks | P1 | open | `07 Sessions/2026-04-01...` | estabilizar gateway antes de religar cron |

## Criterio de fechamento de gap

Um gap fecha quando:

- comportamento esperado esta documentado
- validacao foi executada (manual+artefato ou automatizada)
- impacto residual = zero ou explicitamente aceito
