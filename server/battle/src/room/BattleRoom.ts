import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { SdAdapter, type SdAdapterEvent, type SdTeamSpec } from '../showdown-adapter/SdAdapter.js';
import type { BattleViewState, EffectStyle, PlayerCommand } from '../view-model/types.js';

export interface BattleRoomPlayer {
  name: string;
  team: string;
}

export interface BattleRoomOptions {
  battleId?: string;
  effectStyle?: EffectStyle;
  format?: string;
}

export interface BattleRoomEvents {
  stateUpdate: [state: BattleViewState];
  playerStateUpdate: [playerSlot: 0 | 1, state: BattleViewState];
  ended: [state: BattleViewState];
  error: [message: string];
}

type PlayerStates = [BattleViewState | null, BattleViewState | null];

export class BattleRoom extends EventEmitter<BattleRoomEvents> {
  readonly battleId: string;

  private readonly _adapter: SdAdapter;
  private readonly _players: [BattleRoomPlayer, BattleRoomPlayer];
  private readonly _unsubscribe: () => void;
  private _playerStates: PlayerStates = [null, null];
  private _publicState: BattleViewState | null = null;
  private _started = false;
  private _ended = false;
  private _lastStateUpdateKey: string | null = null;

  constructor(
    p1: BattleRoomPlayer,
    p2: BattleRoomPlayer,
    options: BattleRoomOptions = {},
  ) {
    super();

    this.battleId = options.battleId ?? `battle-${randomUUID()}`;
    this._players = [p1, p2];
    this._adapter = new SdAdapter(this.battleId, options.format, options.effectStyle);
    this._unsubscribe = this._adapter.subscribe((event) => {
      this._handleAdapterEvent(event);
    });

    // Avoid EventEmitter's special unhandled-error behavior for room-level errors.
    this.on('error', () => undefined);
  }

  get id(): string {
    return this.battleId;
  }

  get ended(): boolean {
    return this._ended;
  }

  async start(): Promise<void> {
    if (this._started) {
      return;
    }

    this._started = true;

    const [p1, p2] = this._players;
    const sides: [SdTeamSpec, SdTeamSpec] = [
      { name: p1.name, team: p1.team },
      { name: p2.name, team: p2.team },
    ];

    await this._adapter.start(sides[0], sides[1]);
  }

  close(): void {
    this._unsubscribe();
    this.removeAllListeners();
  }

  getState(): BattleViewState | null {
    return this._publicState ? this._cloneState(this._publicState) : null;
  }

  getPlayerState(playerSlot: 0 | 1): BattleViewState | null {
    const state = this._playerStates[playerSlot];
    return state ? this._cloneState(state) : null;
  }

  submitCommand(playerSlot: 0 | 1, command: PlayerCommand): void {
    if (!this._started) {
      this.emit('error', 'Battle room has not started yet.');
      return;
    }

    if (this._ended) {
      this.emit('error', 'Battle has already ended.');
      return;
    }

    if (command.playerSlot !== playerSlot) {
      this.emit('error', `Command player slot ${command.playerSlot} does not match room slot ${playerSlot}.`);
      return;
    }

    if (command.battleId !== this.battleId) {
      this.emit('error', `Command battleId ${command.battleId} does not match room ${this.battleId}.`);
      return;
    }

    try {
      this._adapter.command(command);
    } catch (error) {
      this.emit('error', `Failed to submit command: ${String(error)}`);
    }
  }

  private _cloneState(state: BattleViewState): BattleViewState {
    return structuredClone(state) as BattleViewState;
  }

  private _emitEnded(state: BattleViewState): void {
    if (this._ended) {
      return;
    }

    this._ended = true;
    this.emit('ended', this._cloneState(state));
  }

  private _handleAdapterEvent(event: SdAdapterEvent): void {
    switch (event.type) {
      case 'state': {
        const state = this._cloneState(event.state);
        this._playerStates[event.playerSlot] = state;
        this.emit('playerStateUpdate', event.playerSlot, this._cloneState(state));

        if (state.phase === 'ended') {
          this._emitEnded(state);
        }
        break;
      }
      case 'spectator-state': {
        const state = this._cloneState(event.state);
        this._publicState = state;

        if (this._shouldEmitStateUpdate(state)) {
          this.emit('stateUpdate', this._cloneState(state));
        }

        if (state.phase === 'ended') {
          this._emitEnded(state);
        }
        break;
      }
      case 'ended': {
        const state = this._publicState ?? this._playerStates[0] ?? this._playerStates[1];
        if (state) {
          this._emitEnded(state);
        }
        break;
      }
      case 'error':
        this.emit('error', event.message);
        break;
    }
  }

  private _shouldEmitStateUpdate(state: BattleViewState): boolean {
    let key: string | null = null;

    if (state.phase === 'preview') {
      key = 'preview';
    } else if (state.phase === 'command') {
      key = `command:${state.turn}`;
    } else if (state.phase === 'ended') {
      key = `ended:${state.turn}:${state.winnerName ?? 'tie'}`;
    }

    if (!key || key === this._lastStateUpdateKey) {
      return false;
    }

    this._lastStateUpdateKey = key;
    return true;
  }
}
