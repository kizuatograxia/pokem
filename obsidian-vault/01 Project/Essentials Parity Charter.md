---
tags:
  - project
  - parity
  - essentials
status: active
---

# Essentials Parity Charter

## Objetivo

Definir a regra oficial de fidelidade do projeto: reproduzir o comportamento e a experiencia do Pokemon Essentials (v21.1 + Gen9 pack aplicado no workspace) com desvio minimo e sempre documentado.

## Fonte canonica

- Runtime e scripts de referencia: `pokemon-essentials-v21.1-gen9`
- Scripts Ruby descompilados para analise de comportamento
- Assets e fluxos visuais do Essentials como baseline de UX

## Regra de paridade

Toda implementacao nova deve cair em um destes estados:

1. **Paridade 1:1**
   - comportamento equivalente ao Essentials
2. **Paridade funcional (aprox.)**
   - comportamento jogavel, mas com diferenca conhecida
3. **Divergencia intencional**
   - diferenca deliberada por motivo tecnico/produto

Nenhuma divergencia e aceita sem registro explicito no gap register.

## Definicao de pronto por feature

Uma feature so fecha quando:

- ha criterio de comparacao com Essentials
- existe evidência de validacao (manual ou automatizada)
- a classificacao de paridade foi registrada
- se houver diferenca: justificativa + impacto + plano de fechamento

## Prioridades de execucao

1. UI/UX base (windowskin, fonte, menus, input)
2. Dados (PBS ownership/importacao)
3. Contrato de batalha autoritativa
4. Battle core deterministica
5. Edge cases e regressao

## Nao-objetivos imediatos

- polimento cosmetico fora da paridade
- novas features sociais antes de contratos
- expansao mobile antes da base deterministica

## Governanca

- cada sessao relevante atualiza o `Essentials Parity Gap Register`
- qualquer mudanca arquitetural que afete paridade gera ADR
- sem evidencia de paridade, item volta para backlog
