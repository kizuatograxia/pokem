---
tags:
  - product
  - planning
  - release
status: active
---

# Release Plan

## Objetivo desta nota

Transformar a direcao ampla do projeto em ondas de entrega claras. A intencao nao e prever datas artificiais, e sim ordenar o trabalho para que cada fase deixe a proxima dramaticamente mais facil.

## Principio de planejamento

O projeto deve evoluir em ondas cumulativas:

- primeiro garantir referencia confiavel
- depois extrair dados e regras
- depois construir a engine autoritativa
- por fim plugar experiencia online e clientes finais

## Fase 0: estabilizacao do workspace

Status atual: em grande parte concluida

Objetivos:

- consolidar a build oficial do Essentials v21.1 + Gen 9
- garantir boot reproduzivel
- documentar fonte de verdade e fluxo de rebuild
- eliminar ambiguidade sobre caminhos oficiais

Entregas:

- build oficial em `pokem-runtime`
- script de rebuild
- launcher
- documentacao operacional inicial
- vault Obsidian

## Fase 1: mapeamento e extracao de dados

Objetivos:

- mapear PBS, scripts relevantes e ownership dos dados
- identificar estruturas minimas para representar roster e legality fora do Essentials
- criar importador tipado com validacao

Entregas:

- inventario de arquivos PBS
- esquema de dados normalizado
- pipeline inicial de importacao
- relatorio de conflitos e lacunas

Definicao de pronto:

- conseguimos responder de onde vem qualquer especie, move, item ou ability
- conseguimos validar referencias quebradas
- sabemos quais dados permanecem fonte e quais passam a ser derivados

## Fase 2: extracao da logica de batalha

Objetivos:

- separar a logica de batalha da dependencia direta da UI do Essentials
- documentar efeitos, prioridades e fluxo de resolucao
- construir fixtures de comparacao

Entregas:

- catalogo dos modulos de batalha relevantes
- matriz de comportamentos criticos
- prototipo de motor deterministico com testes

Definicao de pronto:

- um conjunto inicial de batalhas e cenarios produz o mesmo resultado na referencia e na nova engine

## Fase 3: servicos online basicos

Objetivos:

- criar back-end autoritativo para partidas
- modelar salas, sessoes, comandos, snapshots e resync
- construir protocolo de tempo real

Entregas:

- servico de batalha
- servico de matchmaking
- gateway websocket
- stream publica para espectador

Definicao de pronto:

- dois clientes conseguem entrar numa batalha e concluir uma partida sem desync estrutural

## Fase 4: cliente moderno

Objetivos:

- criar cliente desacoplado do runtime legado
- suportar desktop e web com prioridade
- preparar estrategia de mobile

Entregas:

- shell de cliente
- tela de lobby
- tela de batalha online
- tela de espectador

Definicao de pronto:

- experiencia online principal ja nao depende de abrir o Game.exe do Essentials

## Fase 5: operacao, observabilidade e polimento

Objetivos:

- reforcar telemetria, logs tecnicos e ferramentas de debug
- melhorar onboarding e replays
- preparar escala gradual

Entregas:

- painel tecnico de partidas
- dumps e replays estruturados
- politicas de reconexao e troubleshooting

## Regras de prioridade entre fases

- se uma atividade melhora ownership de dados e reproducibilidade, ela tende a vir antes
- se uma atividade e visualmente atraente mas aumenta acoplamento cedo demais, ela tende a ficar depois
- se uma atividade depende da engine autoritativa, ela nao deve ser adiantada sem justificativa forte

## O que revisar periodicamente

- quais fases ja estao maduras para quebrar em epicos
- quais suposicoes deixaram de valer
- se o runtime oficial ainda representa bem a referencia desejada
