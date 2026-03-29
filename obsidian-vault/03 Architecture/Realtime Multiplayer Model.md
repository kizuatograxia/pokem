---
tags:
  - architecture
  - realtime
  - multiplayer
status: active
---

# Realtime Multiplayer Model

## Objetivo

Definir o modelo de sincronizacao online para batalhas Pokemon sem herdar os problemas classicos de confianca excessiva no cliente.

## Premissa

Batalha Pokemon e um sistema por turnos, nao um jogo de simulacao frame-perfect. Isso muda completamente a estrategia recomendada para rede.

Nao precisamos de lockstep grafico. Precisamos de:

- comandos confiaveis
- servidor autoritativo
- eventos ordenados
- snapshots para recuperacao

## Modelo recomendado

### Servidor autoritativo com event log

O servidor:

- recebe comandos
- valida se o jogador pode agir
- resolve o turno
- gera eventos ordenados
- persiste snapshot + hash
- transmite a visao apropriada para cada participante

### Cliente como apresentacao e input

O cliente:

- coleta a acao do jogador
- envia o comando com contexto suficiente
- espera a resolucao autoritativa
- anima os eventos recebidos

## Tipos de estado

### Estado privado do jogador

Contem:

- hand-like information equivalente ao time completo do proprio jogador
- movimentos conhecidos do proprio Pokemon
- informacoes ocultas que nao devem vazar

### Estado publico

Contem:

- Pokemon revelados
- HP e status visiveis conforme regra do jogo
- efeitos de campo publicos
- eventos observaveis por espectadores

### Estado tecnico do servidor

Contem:

- hashes
- timers internos
- RNG controlado
- trilha de replay
- informacoes privadas de ambos os lados

## Fluxo de um turno

1. servidor notifica fase de escolha
2. clientes enviam comandos
3. servidor valida comandos e timeout
4. servidor resolve o turno
5. servidor registra snapshot e eventos
6. servidor envia payload privado para cada lado e payload publico para espectadores

## Campos minimos de um comando

- `battleId`
- `playerSlot`
- `turnNumber` ou `seq`
- `actionType`
- `actionPayload`
- `clientStateHash`

## Por que hash de estado importa

Mesmo em sistema por turnos, cliente pode:

- ficar atrasado
- enviar comando em estado velho
- sofrer duplicacao ou reconexao confusa

O hash ajuda a detectar quando cliente e servidor ja nao estao falando da mesma fotografia do combate.

## Reconexao

Reconectar nao deve depender de o cliente lembrar tudo. O servidor precisa poder reenviar:

- snapshot mais recente relevante
- fila de eventos ainda nao reconhecidos
- informacoes privadas corretas daquele lado

## Espectadores

Espectadores devem ler um stream derivado, nao a stream crua de um jogador.

Isso evita:

- vazamento de informacao escondida
- acoplamento entre protocolo privado e publico
- improvisos perigosos no filtro de eventos

## Falhas e recuperacao

### Pacote duplicado

Mitigacao:

- usar `seq`
- comandos idempotentes sempre que possivel

### Cliente atrasado

Mitigacao:

- rejeitar comando com hash velho quando necessario
- responder com estado autoritativo para resync

### Desconexao

Mitigacao:

- janela de reconexao
- politicas claras de timeout
- persistencia do estado

### Desync percebido pelo cliente

Mitigacao:

- endpoint ou acao de resync
- invalidacao da visao local transitiva

## O que nao fazer

- permitir que cliente calcule resultado definitivo do turno
- tratar animacao como fonte de verdade
- mandar estado privado bruto para a camada de espectador
- acoplar websocket ao formato interno do runtime legado

## Definicao de sucesso

O modelo esta bom quando:

- a batalha prossegue normalmente sob latencia moderada
- clientes conseguem reconectar
- espectadores entram no meio da partida sem corromper o fluxo
- qualquer divergencia relevante pode ser investigada via snapshots e eventos
