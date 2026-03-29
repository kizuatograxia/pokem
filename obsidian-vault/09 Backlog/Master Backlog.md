---
tags:
  - backlog
  - planning
status: active
---

# Master Backlog

## Objetivo

Concentrar as grandes frentes de trabalho do projeto em um backlog unificado, ordenado por valor estrutural e dependencia.

## Como ler este backlog

- itens no topo destravam mais trabalho futuro
- backlog aqui e estrategico, nao microgerencial
- detalhes operacionais podem ir para [[09 Backlog/Near-Term Execution Plan]]

## Epic 1: consolidar ownership de dados

Descricao:

Transformar Essentials + Gen 9 em uma fonte de dados claramente mapeada e importavel.

Tarefas macro:

- inventariar PBS relevantes
- mapear conflitos e sobreposicoes
- definir schema intermediario
- criar validadores

Valor:

- reduz ambiguidade
- prepara battle engine
- diminui retrabalho

## Epic 2: catalogar a engine de batalha de referencia

Descricao:

Localizar e descrever os modulos do Essentials que sao realmente fundamentais para a batalha.

Tarefas macro:

- mapear scripts criticos
- documentar estruturas de estado
- listar mecanismos sensiveis a ordem
- definir fixtures de comparacao

## Epic 3: projetar e implementar importador tipado

Descricao:

Criar pipeline reprodutivel que transforma dados brutos em datasets normalizados.

Tarefas macro:

- parser
- normalizacao
- validacao
- emissao versionada

## Epic 4: desenhar o contrato da engine autoritativa

Descricao:

Definir estado, comandos, eventos e snapshots da batalha futura.

Tarefas macro:

- state model
- command model
- event taxonomy
- strategy de hash e resync

## Epic 5: prototipo da battle engine

Descricao:

Construir um primeiro motor deterministico para cenarios limitados.

Tarefas macro:

- subset inicial 1v1
- damage flow basico
- status e faint
- comparacao com referencia

## Epic 6: servicos online basicos

Descricao:

Criar a base de matchmaking, sessoes e tempo real.

Tarefas macro:

- gateway websocket
- matchmaking
- battle service
- spectator stream

## Epic 7: cliente moderno

Descricao:

Sair da dependencia de UX do runtime legado.

Tarefas macro:

- shell de aplicacao
- lobby
- battle UI
- spectator UI

## Epic 8: observabilidade e operacao

Descricao:

Garantir que o sistema seja auditavel e depuravel.

Tarefas macro:

- replay estruturado
- logs tecnicos
- ferramentas de comparacao de estado
- guias de troubleshooting

## Regras de priorizacao

- ownership e dados antes de brilho visual
- contratos antes de animacoes finais
- reproducibilidade antes de conforto temporario
