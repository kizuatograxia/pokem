import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { SdAdapter } from '../showdown-adapter/SdAdapter.js';
export class BattleRoom extends EventEmitter {
    battleId;
    _adapter;
    _players;
    _unsubscribe;
    _playerStates = [null, null];
    _publicState = null;
    _started = false;
    _ended = false;
    _lastStateUpdateKey = null;
    constructor(p1, p2, options = {}) {
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
    get id() {
        return this.battleId;
    }
    get ended() {
        return this._ended;
    }
    async start() {
        if (this._started) {
            return;
        }
        this._started = true;
        const [p1, p2] = this._players;
        const sides = [
            { name: p1.name, team: p1.team },
            { name: p2.name, team: p2.team },
        ];
        await this._adapter.start(sides[0], sides[1]);
    }
    close() {
        this._unsubscribe();
        this.removeAllListeners();
    }
    getState() {
        return this._publicState ? this._cloneState(this._publicState) : null;
    }
    getPlayerState(playerSlot) {
        const state = this._playerStates[playerSlot];
        return state ? this._cloneState(state) : null;
    }
    submitCommand(playerSlot, command) {
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
        }
        catch (error) {
            this.emit('error', `Failed to submit command: ${String(error)}`);
        }
    }
    _cloneState(state) {
        return structuredClone(state);
    }
    _emitEnded(state) {
        if (this._ended) {
            return;
        }
        this._ended = true;
        this.emit('ended', this._cloneState(state));
    }
    _handleAdapterEvent(event) {
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
    _shouldEmitStateUpdate(state) {
        let key = null;
        if (state.phase === 'preview') {
            key = 'preview';
        }
        else if (state.phase === 'command') {
            key = `command:${state.turn}`;
        }
        else if (state.phase === 'ended') {
            key = `ended:${state.turn}:${state.winnerName ?? 'tie'}`;
        }
        if (!key || key === this._lastStateUpdateKey) {
            return false;
        }
        this._lastStateUpdateKey = key;
        return true;
    }
}
