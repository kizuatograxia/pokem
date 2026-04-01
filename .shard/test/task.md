# Task: BattleRoom + WebSocket transport — server/battle

## Objetivo
Implementar a camada de orquestração e transporte que falta em `server/battle` para que o frontend possa jogar batalhas reais.

## Contexto
- Contrato canônico: `server/battle/src/view-model/types.ts` — NÃO MODIFICAR
- `SdAdapter` e `BattleTranslator` já existem e funcionam
- Rodar tudo dentro de `server/battle/`
- Servidor deve escutar na porta **8788**

## O que implementar

### 1. `server/battle/src/room/BattleRoom.ts`
- Recebe dois jogadores (p1 e p2) com times em formato Showdown packed team string
- Instancia `SdAdapter` + `BattleTranslator`
- Expõe `submitCommand(playerSlot: 0|1, command: PlayerCommand): void`
- Emite evento `stateUpdate` com `BattleViewState` após cada resolução de turno
- Detecta `phase === 'ended'` e emite evento `ended`

### 2. `server/battle/src/gateway/Matchmaker.ts`
- Fila FIFO simples
- Quando 2 jogadores na fila: cria `BattleRoom`, retorna `{ room, slots: [ws0, ws1] }`
- Se cliente não enviar team, usar o time padrão abaixo

### 3. `server/battle/src/gateway/WsGateway.ts`
- Servidor WebSocket com pacote `ws` (adicionar ao package.json)
- Porta 8788
- Protocolo de mensagens JSON:
  - Cliente → `{ type: 'join', team?: string }` — entra na fila
  - Servidor → `{ type: 'match', battleId: string, playerSlot: 0|1 }` — emparelhado
  - Cliente → `{ type: 'command', ...PlayerCommand }` — envia jogada
  - Servidor → `{ type: 'state', state: BattleViewState }` — estado após turno
  - Servidor → `{ type: 'error', message: string }` — em caso de erro

### 4. `server/battle/src/gateway/server.ts`
- Entrypoint: instancia `WsGateway` e faz `gateway.listen(8788)`

### 5. Atualizar `server/battle/package.json`
- Adicionar `"ws"` e `"@types/ws"` nas dependências
- Adicionar script `"start": "node dist/gateway/server.js"`

### 6. Exportar em `server/battle/src/index.ts`
- Adicionar exports de `BattleRoom`, `WsGateway`, `Matchmaker`

## Time padrão de teste (fallback quando cliente não enviar team)
```
Pikachu||lightball||thunderbolt,quickattack,irontail,thunder|Timid|,,,252,,252|M|||||
Charizard||choicespecs||flamethrower,airslash,focusblast,dragondance|Timid|,,,252,,252|M|||||
Blastoise||leftovers||scald,icebeam,flashcannon,rapidspin|Bold|252,,252,,,|M|||||
Venusaur||blacksludge||sludgebomb,energyball,synthesis,sleeppowder|Calm|252,,4,,252,|M|||||
Gengar||lifeorb||shadowball,focusblast,sludgebomb,willowisp|Timid|,,,252,,252|M|||||
Snorlax||leftovers||bodyslam,earthquake,crunch,rest|Careful|252,,4,,252,|M|||||
```

## Critérios de pronto
1. `cd server/battle && npx tsc --noEmit` passa sem erros
2. `node dist/gateway/server.js` sobe sem crash
3. Smoke test: dois clientes WS conectam, emparelham, enviam move, recebem `BattleViewState` com turno resolvido
4. Resultado em `.shard/test/result.md`
