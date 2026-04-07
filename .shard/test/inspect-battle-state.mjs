import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { once } from "node:events";

const requireFromBattle = createRequire(new URL("../../server/battle/package.json", import.meta.url));
const WebSocket = requireFromBattle("ws");

const repoRoot = process.cwd();
const outputPath = path.join(repoRoot, ".shard", "test", "inspect-battle-state.json");
const targetUrl = process.argv[2] || "ws://127.0.0.1:8788";

async function main() {
  const clients = ["p1", "p2"].map((label) => ({
    label,
    battleId: null,
    playerSlot: null,
    states: [],
    socket: new WebSocket(targetUrl),
  }));

  await Promise.all(clients.map((client) => once(client.socket, "open")));

  const done = new Promise((resolve, reject) => {
    clients.forEach((client) => {
      client.socket.on("message", (raw) => {
        try {
          const message = JSON.parse(raw.toString());

          if (message.type === "error") {
            reject(new Error(`${client.label}: ${message.message}`));
            return;
          }

          if (message.type === "match") {
            client.battleId = message.battleId;
            client.playerSlot = message.playerSlot;
            return;
          }

          if (message.type === "state" && client.states.length < 5) {
            client.states.push(message.state);
          }

          if (clients.every((entry) => entry.states.length >= 2)) {
            resolve();
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    clients.forEach((client) => {
      client.socket.send(JSON.stringify({ type: "join" }));
    });
  });

  await done;

  const payload = clients.map((client) => ({
    label: client.label,
    targetUrl,
    battleId: client.battleId,
    playerSlot: client.playerSlot,
    states: client.states,
  }));

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));

  clients.forEach((client) => client.socket.close());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
