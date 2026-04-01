---
tags:
  - backlog
  - parity
  - execution
status: active
---

# Essentials Parity Task Breakdown

## Sprint atual (execucao imediata)

### Bloco A — UI 1:1

1. **A1 — Finalizar PkeWindow 9-patch**
   - Entrada: `client/web/public/assets/windowskins/001-Blue01.png`
   - Saida: `PkeWindow.tsx` integrado em `PixelFrame`
   - Critero de pronto: `tsc` ok + screenshot comparativo sem clipping

2. **A2 — Padronizar resolucao UI vs Hub**
   - Decidir estrategia unica (adaptar Hub para 512x384 ou unificar pipeline)
   - Critero de pronto: uma politica documentada + aplicada no runtime

3. **A3 — Fechar PC/storage para paridade funcional completa**
   - Completar comandos faltantes e estados visuais
   - Critero de pronto: fluxo completo sem placeholder

### Bloco B — Dados

4. **B1 — Inventario PBS completo**
   - Listar arquivos + ownership + override Gen9
   - Critero de pronto: tabela publicada no vault

5. **B2 — Esqueleto do importador tipado**
   - Definir schema inicial e parser minimo
   - Critero de pronto: artefato gerado de dados reais

### Bloco C — Battle core

6. **C1 — Contrato autoritativo v0**
   - Estado, comandos, eventos, snapshots
   - Critero de pronto: simulacao de turno simples no papel

7. **C2 — Harness de comparacao Essentials vs runtime**
   - Casos seed de turno/priority/damage/status
   - Critero de pronto: primeira bateria executando com relatorio

## Delegacao sugerida por agente

- **Codex**: implementacao de codigo (A1, A3, B2, C2)
- **Gemini**: apoio de analise/estrutura documental (B1, C1, criterios e checklists)
- **OpenClaw**: automacoes de operacao, scripts e validacoes de ambiente (apos estabilidade gateway)

## Ordem recomendada (curta)

1. A1
2. A2
3. A3
4. B1
5. B2
6. C1
7. C2

## Gate de execucao

Nao religar automacao cron de worker antes de validar estabilidade do gateway local.
