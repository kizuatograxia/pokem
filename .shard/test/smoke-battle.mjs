import { once } from 'node:events';
import { createRequire } from 'node:module';
import { WsGateway } from '../../server/battle/dist/gateway/WsGateway.js';

const requireFromBattle = createRequire(new URL('../../server/battle/package.json', import.meta.url));
const WebSocket = requireFromBattle('ws');

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms.`));
      }, ms);
    }),
  ]);
}

function buildCommand(context, state) {
  const pending = state.pendingRequest;
  if (!pending || context.battleId === null || context.playerSlot === null) {
    return null;
  }

  const requestKey = pending.kind === 'team'
    ? 'team-preview'
    : `${pending.kind}:${state.turn}`;
  if (context.sentRequests.has(requestKey)) {
    return null;
  }

  switch (pending.kind) {
    case 'team': {
      const order = pending.switches.map((slot) => slot.position);
      context.sentRequests.add(requestKey);
      return {
        kind: 'team',
        battleId: context.battleId,
        playerSlot: context.playerSlot,
        order,
      };
    }

    case 'move': {
      const slot = pending.slots.find((entry) => !entry.forceSwitch) ?? pending.slots[0];
      const move = slot?.moves.find((entry) => !entry.disabled && entry.pp > 0);
      if (!slot || !move) {
        throw new Error(`Client ${context.label} did not receive a usable move request.`);
      }

      context.sentRequests.add(requestKey);
      return {
        kind: 'move',
        battleId: context.battleId,
        playerSlot: context.playerSlot,
        activeSlot: slot.slot,
        turn: state.turn,
        stateHash: 'smoke-test',
        moveIndex: move.index,
        mega: false,
        tera: false,
        dynamax: false,
      };
    }

    case 'switch': {
      const slot = pending.slots.find((entry) => entry.forceSwitch) ?? pending.slots[0];
      const choice = pending.switches[0];
      if (!slot || !choice) {
        throw new Error(`Client ${context.label} did not receive a usable switch request.`);
      }

      context.sentRequests.add(requestKey);
      return {
        kind: 'switch',
        battleId: context.battleId,
        playerSlot: context.playerSlot,
        activeSlot: slot.slot,
        turn: state.turn,
        stateHash: 'smoke-test',
        partyIndex: choice.position,
      };
    }

    case 'wait':
      return null;
  }
}

async function main() {
  const port = 8790;
  const gateway = new WsGateway();
  gateway.listen(port);

  try {
    const clients = ['p1', 'p2'].map((label) => ({
      battleId: null,
      label,
      playerSlot: null,
      resolvedTurn: false,
      sentRequests: new Set(),
      socket: new WebSocket(`ws://127.0.0.1:${port}`),
    }));

    await withTimeout(Promise.all(clients.map((client) => once(client.socket, 'open'))), 5000, 'Client connection');

    const finished = new Promise((resolve, reject) => {
      const maybeResolve = () => {
        if (clients.every((client) => client.resolvedTurn)) {
          resolve();
        }
      };

      clients.forEach((client) => {
        client.socket.on('message', (raw) => {
          try {
            const message = JSON.parse(raw.toString());

            if (message.type === 'error') {
              reject(new Error(`Gateway error for ${client.label}: ${message.message}`));
              return;
            }

            if (message.type === 'match') {
              client.battleId = message.battleId;
              client.playerSlot = message.playerSlot;
              return;
            }

            if (message.type !== 'state') {
              return;
            }

            const state = message.state;
            if (state.turn >= 2 && (state.phase === 'command' || state.phase === 'ended')) {
              client.resolvedTurn = true;
              maybeResolve();
            }

            const command = buildCommand(client, state);
            if (command) {
              client.socket.send(JSON.stringify({ type: 'command', ...command }));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      clients.forEach((client) => {
        client.socket.send(JSON.stringify({ type: 'join' }));
      });
    });

    await withTimeout(finished, 20000, 'Battle smoke test');

    clients.forEach((client) => {
      client.socket.close();
    });

    console.log('Smoke test passed: two clients matched, submitted commands, and reached a resolved turn.');
  } finally {
    await gateway.close();
  }
}

await main();
