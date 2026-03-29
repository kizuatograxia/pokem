---
tags:
  - architecture
  - overview
status: active
---

# System Overview

## Objetivo

Descrever a arquitetura-alvo do projeto sem confundir:

- runtime de referencia atual
- ferramentas de extracao/importacao
- servicos online futuros
- clientes finais

## Macrovisao

O sistema deve ser entendido em quatro grandes blocos:

1. referencia jogavel atual
2. camada de dados e importacao
3. servicos online autoritativos
4. clientes e interfaces de usuario

## Bloco 1: referencia jogavel atual

Representado por:

`C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`

Papel:

- servir como baseline comportamental
- permitir validacao manual e exploratoria
- apoiar comparacao de regras, efeitos e fluxos de batalha

Nao deve ser tratado como:

- back-end online definitivo
- cliente moderno final
- fonte unica de verdade sobre organizacao do futuro sistema

## Bloco 2: camada de dados e importacao

Responsabilidade:

- extrair dados das fontes do Essentials e Gen 9
- normalizar especies, moves, items, abilities, forms e learnsets
- gerar artefatos reutilizaveis para a engine e para os clientes

Subcomponentes desejados:

- parser PBS
- normalizador de identificadores e referencias
- validador de integridade
- exportador versionado de dados

Entradas principais:

- `sources\pokemon-essentials-21.1`
- `sources\generation-9-pack-v3.3.4`

Saidas desejadas:

- datasets normalizados
- relatorios de validacao
- fixtures para testes da engine

## Bloco 3: servicos online autoritativos

### Battle service

Responsavel por:

- manter o estado canonico da batalha
- validar comandos recebidos
- resolver turnos
- produzir eventos, snapshots e hashes de estado

### Matchmaking service

Responsavel por:

- enfileirar jogadores
- casar regras e formatos
- criar sessoes de partida

### Gateway realtime

Responsavel por:

- conexoes websocket
- autenticacao de sessao
- entrega de eventos
- heartbeat
- reconexao

### Spectator stream

Responsavel por:

- derivar uma visao publica da batalha
- distribuir atualizacoes para espectadores
- ocultar informacao privada

### Persistence and replay layer

Responsavel por:

- armazenar snapshots
- armazenar event log
- recuperar batalhas
- suportar replay e investigacao tecnica

## Bloco 4: clientes

### Cliente de referencia atual

O `Game.exe` do Essentials serve apenas como base temporaria de referencia comportamental.

### Cliente moderno futuro

Deve consumir:

- dados normalizados
- stream de estado publico e privado
- endpoints de matchmaking e sessao

Deve oferecer:

- lobby
- selecao e validacao de time
- tela de batalha
- tela de espectador
- reconexao transparente sempre que possivel

## Contratos centrais do sistema futuro

### Contrato de dados

Define como especies, moves, items e abilities sao representados fora do Essentials.

### Contrato de estado de batalha

Define:

- participantes
- campo
- sides
- Pokemon ativos e reserva
- timers
- visibilidade publica versus privada

### Contrato de evento

Define:

- comandos recebidos
- eventos aplicados
- mudancas de fase
- hashes de estado

## Invariantes arquiteturais

- o servidor e autoritativo
- dados importados devem ter proveniencia clara
- espectador recebe apenas o que e publico
- cliente nao resolve o turno final
- runtime legado e ferramenta de referencia, nao centro da arquitetura futura

## Diagrama mental simples

Fonte de dados -> importador -> datasets validados -> engine autoritativa -> gateway realtime -> clientes jogador/espectador

Em paralelo:

runtime Essentials -> comparacao e fixture -> ajuda a validar a nova engine
