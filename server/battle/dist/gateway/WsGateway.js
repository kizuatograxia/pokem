import WebSocket, { WebSocketServer } from 'ws';
import { Matchmaker } from './Matchmaker.js';
function isPlayerCommand(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return candidate.kind === 'move'
        || candidate.kind === 'switch'
        || candidate.kind === 'team'
        || candidate.kind === 'shift'
        || candidate.kind === 'item'
        || candidate.kind === 'multi-choice';
}
export class WsGateway {
    _matchmaker = new Matchmaker();
    _roomBindings = new Map();
    _sessions = new Map();
    _server = null;
    listen(port = 8788) {
        if (this._server) {
            throw new Error('WebSocket gateway is already listening.');
        }
        this._server = new WebSocketServer({ host: '0.0.0.0', port });
        this._server.on('connection', (socket) => {
            this._handleConnection(socket);
        });
    }
    async close() {
        const server = this._server;
        if (!server) {
            return;
        }
        this._server = null;
        for (const socket of this._sessions.keys()) {
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close();
            }
        }
        for (const binding of this._roomBindings.values()) {
            binding.cleanup();
        }
        this._roomBindings.clear();
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }
    _bindRoom(room, sockets) {
        if (this._roomBindings.has(room.battleId)) {
            return;
        }
        const onPlayerStateUpdate = (playerSlot, state) => {
            const socket = sockets[playerSlot];
            this._sendMessage(socket, { type: 'state', state });
        };
        const onRoomError = (message) => {
            for (const socket of sockets) {
                this._sendError(socket, message);
            }
        };
        const onEnded = () => {
            const binding = this._roomBindings.get(room.battleId);
            binding?.cleanup();
            this._roomBindings.delete(room.battleId);
        };
        room.on('playerStateUpdate', onPlayerStateUpdate);
        room.on('error', onRoomError);
        room.on('ended', onEnded);
        this._roomBindings.set(room.battleId, {
            sockets,
            cleanup: () => {
                room.off('playerStateUpdate', onPlayerStateUpdate);
                room.off('error', onRoomError);
                room.off('ended', onEnded);
            },
        });
    }
    _handleClose(socket) {
        const session = this._sessions.get(socket);
        if (!session) {
            return;
        }
        this._matchmaker.remove(socket);
        this._sessions.delete(socket);
        if (!session.room || session.playerSlot === null) {
            return;
        }
        const binding = this._roomBindings.get(session.room.battleId);
        if (!binding) {
            return;
        }
        const opponentSlot = session.playerSlot === 0 ? 1 : 0;
        const opponentSocket = binding.sockets[opponentSlot];
        this._sendError(opponentSocket, 'Opponent disconnected.');
        binding.cleanup();
        this._roomBindings.delete(session.room.battleId);
        const opponentSession = this._sessions.get(opponentSocket);
        if (opponentSession) {
            opponentSession.room = null;
            opponentSession.playerSlot = null;
            opponentSession.queued = false;
        }
    }
    _handleCommand(socket, message) {
        const session = this._sessions.get(socket);
        if (!session || !session.room || session.playerSlot === null) {
            this._sendError(socket, 'You are not currently assigned to a battle room.');
            return;
        }
        if (message.playerSlot !== session.playerSlot) {
            this._sendError(socket, `Socket is assigned to player slot ${session.playerSlot}.`);
            return;
        }
        if (message.battleId !== session.room.battleId) {
            this._sendError(socket, `Socket is assigned to battle ${session.room.battleId}.`);
            return;
        }
        session.room.submitCommand(session.playerSlot, message);
    }
    _handleConnection(socket) {
        this._sessions.set(socket, {
            playerSlot: null,
            queued: false,
            room: null,
        });
        socket.on('close', () => {
            this._handleClose(socket);
        });
        socket.on('message', (data, isBinary) => {
            if (isBinary) {
                this._sendError(socket, 'Binary messages are not supported.');
                return;
            }
            const message = this._parseMessage(data);
            if (!message) {
                this._sendError(socket, 'Invalid JSON message.');
                return;
            }
            switch (message.type) {
                case 'join':
                    this._handleJoin(socket, message);
                    break;
                case 'command':
                    if (!isPlayerCommand(message)) {
                        this._sendError(socket, 'Command payload is missing a valid PlayerCommand.');
                        return;
                    }
                    this._handleCommand(socket, message);
                    break;
            }
        });
    }
    _handleJoin(socket, message) {
        const session = this._sessions.get(socket);
        if (!session) {
            this._sendError(socket, 'Session not found for socket.');
            return;
        }
        if (session.queued || session.room) {
            this._sendError(socket, 'Socket has already joined matchmaking.');
            return;
        }
        session.queued = true;
        const match = this._matchmaker.enqueue(socket, message.team);
        if (!match) {
            return;
        }
        this._bindRoom(match.room, match.slots);
        match.slots.forEach((matchedSocket, index) => {
            const matchedSession = this._sessions.get(matchedSocket);
            if (!matchedSession) {
                return;
            }
            matchedSession.queued = false;
            matchedSession.room = match.room;
            matchedSession.playerSlot = index;
            this._sendMessage(matchedSocket, {
                type: 'match',
                battleId: match.room.battleId,
                playerSlot: index,
            });
        });
        void match.room.start();
    }
    _parseMessage(data) {
        const rawText = typeof data === 'string' ? data : data.toString();
        try {
            const parsed = JSON.parse(rawText);
            if (!parsed || typeof parsed !== 'object') {
                return null;
            }
            const message = parsed;
            if (message.type !== 'join' && message.type !== 'command') {
                return null;
            }
            return parsed;
        }
        catch {
            return null;
        }
    }
    _sendError(socket, message) {
        this._sendMessage(socket, { type: 'error', message });
    }
    _sendMessage(socket, payload) {
        if (socket.readyState !== WebSocket.OPEN) {
            return;
        }
        socket.send(JSON.stringify(payload));
    }
}
