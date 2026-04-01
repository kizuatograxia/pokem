import WebSocket from 'ws';
import { BattleRoom } from '../room/BattleRoom.js';
export const DEFAULT_PACKED_TEAM = [
    'Pikachu||lightball||thunderbolt,quickattack,irontail,thunder|Timid|,,,252,,252|M|||||',
    'Charizard||choicespecs||flamethrower,airslash,focusblast,dragondance|Timid|,,,252,,252|M|||||',
    'Blastoise||leftovers||scald,icebeam,flashcannon,rapidspin|Bold|252,,252,,,|M|||||',
    'Venusaur||blacksludge||sludgebomb,energyball,synthesis,sleeppowder|Calm|252,,4,,252,|M|||||',
    'Gengar||lifeorb||shadowball,focusblast,sludgebomb,willowisp|Timid|,,,252,,252|M|||||',
    'Snorlax||leftovers||bodyslam,earthquake,crunch,rest|Careful|252,,4,,252,|M|||||',
].join(']');
export function normalizePackedTeam(team) {
    const trimmed = team?.trim();
    if (!trimmed) {
        return DEFAULT_PACKED_TEAM;
    }
    if (trimmed.includes(']')) {
        return trimmed;
    }
    const lines = trimmed
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
    return lines.length > 1 ? lines.join(']') : trimmed;
}
export class Matchmaker {
    _queue = [];
    enqueue(socket, team) {
        const queuedPlayer = this._takeNextQueuedPlayer();
        const currentPlayer = {
            socket,
            team: normalizePackedTeam(team),
        };
        if (!queuedPlayer) {
            this._queue.push(currentPlayer);
            return null;
        }
        const room = new BattleRoom({ name: 'Player 1', team: queuedPlayer.team }, { name: 'Player 2', team: currentPlayer.team });
        return {
            room,
            slots: [queuedPlayer.socket, currentPlayer.socket],
        };
    }
    remove(socket) {
        this._queue = this._queue.filter((entry) => entry.socket !== socket);
    }
    get queueLength() {
        return this._queue.length;
    }
    _takeNextQueuedPlayer() {
        while (this._queue.length > 0) {
            const queuedPlayer = this._queue.shift() ?? null;
            if (queuedPlayer && queuedPlayer.socket.readyState === WebSocket.OPEN) {
                return queuedPlayer;
            }
        }
        return null;
    }
}
