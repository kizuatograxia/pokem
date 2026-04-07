import WebSocket, { WebSocketServer, type RawData } from 'ws';
import { Matchmaker } from './Matchmaker.js';
import type { BattleViewState, PlayerCommand } from '../view-model/types.js';
import type { BattleRoom } from '../room/BattleRoom.js';

interface JoinMessage {
  type: 'join';
  team?: string;
}

type CommandMessage = { type: 'command' } & PlayerCommand;
type ClientMessage = JoinMessage | CommandMessage;

interface MatchMessage {
  type: 'match';
  battleId: string;
  playerSlot: 0 | 1;
}

interface StateMessage {
  type: 'state';
  state: BattleViewState;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type ServerMessage = ErrorMessage | MatchMessage | StateMessage;

interface ClientSession {
  playerSlot: 0 | 1 | null;
  queued: boolean;
  room: BattleRoom | null;
}

interface RoomBinding {
  cleanup: () => void;
  sockets: [WebSocket, WebSocket];
}

function isPlayerCommand(value: unknown): value is PlayerCommand {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.kind === 'move'
    || candidate.kind === 'switch'
    || candidate.kind === 'team'
    || candidate.kind === 'shift'
    || candidate.kind === 'item'
    || candidate.kind === 'multi-choice';
}

export class WsGateway {
  private readonly _matchmaker = new Matchmaker();
  private readonly _roomBindings = new Map<string, RoomBinding>();
  private readonly _sessions = new Map<WebSocket, ClientSession>();
  private _server: WebSocketServer | null = null;

  listen(port = 8788): void {
    if (this._server) {
      throw new Error('WebSocket gateway is already listening.');
    }

    this._server = new WebSocketServer({ host: '0.0.0.0', port });
    this._server.on('connection', (socket) => {
      this._handleConnection(socket);
    });
  }

  async close(): Promise<void> {
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

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private _bindRoom(room: BattleRoom, sockets: [WebSocket, WebSocket]): void {
    if (this._roomBindings.has(room.battleId)) {
      return;
    }

    const onPlayerStateUpdate = (playerSlot: 0 | 1, state: BattleViewState) => {
      const socket = sockets[playerSlot];
      this._sendMessage(socket, { type: 'state', state });
    };

    const onRoomError = (message: string) => {
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

  private _handleClose(socket: WebSocket): void {
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

    const opponentSlot: 0 | 1 = session.playerSlot === 0 ? 1 : 0;
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

  private _handleCommand(socket: WebSocket, message: CommandMessage): void {
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

  private _handleConnection(socket: WebSocket): void {
    this._sessions.set(socket, {
      playerSlot: null,
      queued: false,
      room: null,
    });

    socket.on('close', () => {
      this._handleClose(socket);
    });

    socket.on('message', (data: RawData, isBinary: boolean) => {
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

  private _handleJoin(socket: WebSocket, message: JoinMessage): void {
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
      matchedSession.playerSlot = index as 0 | 1;

      this._sendMessage(matchedSocket, {
        type: 'match',
        battleId: match.room.battleId,
        playerSlot: index as 0 | 1,
      });
    });

    void match.room.start();
  }

  private _parseMessage(data: RawData): ClientMessage | null {
    const rawText = typeof data === 'string' ? data : data.toString();

    try {
      const parsed = JSON.parse(rawText) as unknown;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const message = parsed as Record<string, unknown>;
      if (message.type !== 'join' && message.type !== 'command') {
        return null;
      }

      return parsed as ClientMessage;
    } catch {
      return null;
    }
  }

  private _sendError(socket: WebSocket, message: string): void {
    this._sendMessage(socket, { type: 'error', message });
  }

  private _sendMessage(socket: WebSocket, payload: ServerMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }
}
