---
tags:
  - backlog
  - execution
status: active
---

# Near-Term Execution Plan

## Objetivo

Traduzir o backlog estrategico em um plano de trabalho imediato e pragmatico para as proximas iteracoes.

## Janela atual de execucao

O foco atual deve ser sair da fase de estabilizacao do runtime e entrar na fase de dominio real do sistema.

## Prioridade 1: inventario tecnico da batalha

Entregas:

- lista de scripts do Essentials ligados a batalha
- mapa dos principais pontos de entrada e fluxo
- classificacao entre dado, regra e UI

Critero de pronto:

- conseguimos explicar onde mora cada parte central da batalha no runtime de referencia

## Prioridade 2: inventario de dados PBS

Entregas:

- lista de arquivos PBS relevantes
- tabela de ownership
- apontamento de sobreposicoes entre base e Gen 9

Critero de pronto:

- conseguimos dizer quais arquivos viram input do importador e quais exigem regra adicional

## Prioridade 3: estrutura do importador

Entregas:

- decisao do local do importador no workspace futuro
- schema inicial
- parser minimo para um subconjunto de PBS

Critero de pronto:

- primeiro artefato estruturado gerado a partir de dados reais

## Prioridade 4: contrato inicial da batalha autoritativa

Entregas:

- nota de modelo de estado
- formato inicial de comandos
- proposta de eventos minimos

Critero de pronto:

- conseguimos simular um turno simples no papel sem depender do cliente

## Prioridade 5: higiene do workspace

Entregas:

- confirmar se `backend-monero` sera mantido, arquivado ou substituido por modulo mais apropriado
- garantir que scripts e docs antigos apontem para os caminhos oficiais atuais

## Frente operacional transversal: estabilizacao de automacao (OpenClaw)

Entregas:

- playbook curto de diagnostico do gateway (`status`, `gateway status`, `gateway probe`)
- criterio objetivo de estabilidade antes de religar cron worker
- fluxo de rollback rapido para disable de cron em caso de erro intermitente

Criterio de pronto:

- gateway sem erro `closed 1000` em janela de observacao definida
- automacao de tasks roda sem loop e sem duplicacao

## Proxima sequencia sugerida

1. estabilizar gateway e playbook operacional
2. inventariar scripts de batalha
3. inventariar PBS
4. escolher o lugar do importador
5. criar schema inicial
6. registrar decisoes novas em ADR se necessario

## O que nao deveria entrar agora

- polimento visual de cliente final
- mobile antes dos contratos
- features sociais complexas
- novas camadas de runtime sem ownership claro
