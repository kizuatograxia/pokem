/**
 * battle-server entry point
 *
 * Layer map:
 *   SdAdapter          — wraps the pkmn sim adapter, produces typed SdAdapterEvents
 *   BattleTranslator   — converts Showdown protocol events to BattleViewState
 *   view-model/types   — canonical contract for the frontend
 *   BattleRoom         — orchestrates a single battle (two players)
 *   Matchmaker         — queues players and pairs them into BattleRooms
 *   WsGateway          — WebSocket server (port 8788) — entry: src/gateway/server.ts
 */

export { SdAdapter } from './showdown-adapter/SdAdapter.js';
export { BattleTranslator } from './showdown-adapter/translator/BattleTranslator.js';
export { parseShowdownLine, parseShowdownChunk, parseHpStatus } from './showdown-adapter/protocol/parser.js';
export { BattleRoom } from './room/BattleRoom.js';
export { Matchmaker, DEFAULT_PACKED_TEAM, normalizePackedTeam } from './gateway/Matchmaker.js';
export { WsGateway } from './gateway/WsGateway.js';
export type * from './view-model/types.js';
export type * from './showdown-adapter/protocol/types.js';
export type * from './showdown-adapter/SdAdapter.js';
