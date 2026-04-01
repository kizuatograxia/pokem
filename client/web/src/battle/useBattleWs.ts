import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BattleViewState,
  MoveCommand,
  PlayerCommand,
  SwitchCommand,
} from "../../../server/battle/src/view-model/types.js";

export type BattleStatus =
  | "idle"
  | "connecting"
  | "waiting"
  | "active"
  | "ended"
  | "error";

export interface UseBattleWsResult {
  status: BattleStatus;
  battleId: string | null;
  playerSlot: 0 | 1 | null;
  state: BattleViewState | null;
  error: string | null;
  sendCommand: (cmd: PlayerCommand) => void;
}

const DEFAULT_SERVER = "ws://localhost:5173/battle-ws";

// ─── CPU bot ─────────────────────────────────────────────────────────────────

function runCpuBot(serverUrl: string): WebSocket {
  const ws = new WebSocket(serverUrl);
  let slot: 0 | 1 | null = null;
  let battleId: string | null = null;

  ws.addEventListener("open", () => {
    ws.send(JSON.stringify({ type: "join" }));
  });

  ws.addEventListener("message", (ev: MessageEvent) => {
    try {
      const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
      if (msg.type === "match") {
        slot = msg.playerSlot as 0 | 1;
        battleId = msg.battleId as string;
        return;
      }
      if (msg.type === "state" && slot !== null && battleId !== null) {
        const state = msg.state as BattleViewState;
        const req = state.pendingRequest;
        if (!req) return;

        if (req.kind === "move") {
          const slotReq = req.slots[0];
          if (!slotReq) return;
          const move = slotReq.moves.find((m) => !m.disabled) ?? slotReq.moves[0];
          if (!move) return;
          const cmd: MoveCommand = {
            kind: "move",
            battleId,
            playerSlot: slot,
            activeSlot: 0,
            turn: state.turn,
            stateHash: "",
            moveIndex: move.index,
            mega: false,
            tera: false,
            dynamax: false,
          };
          ws.send(JSON.stringify({ type: "command", ...cmd }));
          return;
        }

        if (req.kind === "switch") {
          const sw = req.switches.find((s) => s.hpStatus === "alive");
          if (!sw) return;
          const cmd: SwitchCommand = {
            kind: "switch",
            battleId,
            playerSlot: slot,
            activeSlot: 0,
            turn: state.turn,
            stateHash: "",
            partyIndex: sw.position,
          };
          ws.send(JSON.stringify({ type: "command", ...cmd }));
        }
      }
      if (msg.type === "ended") {
        ws.close();
      }
    } catch {
      // ignore
    }
  });

  return ws;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBattleWs(opts: {
  serverUrl?: string;
  cpu?: boolean;
  enabled?: boolean;
}): UseBattleWsResult {
  const { serverUrl = DEFAULT_SERVER, cpu = true, enabled = false } = opts;

  const [status, setStatus] = useState<BattleStatus>("idle");
  const [state, setState] = useState<BattleViewState | null>(null);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [playerSlot, setPlayerSlot] = useState<0 | 1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const botRef = useRef<WebSocket | null>(null);

  const sendCommand = useCallback((cmd: PlayerCommand) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "command", ...cmd }));
  }, []);

  useEffect(() => {
    if (!enabled) return;

    setStatus("connecting");
    setError(null);

    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "join" }));
      setStatus("waiting");
      if (cpu) {
        // Start bot after p1 is registered in the queue
        setTimeout(() => {
          botRef.current = runCpuBot(serverUrl);
        }, 200);
      }
    });

    ws.addEventListener("message", (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>;

        if (msg.type === "waiting") {
          setStatus("waiting");
          return;
        }

        if (msg.type === "match") {
          setBattleId(msg.battleId as string);
          setPlayerSlot(msg.playerSlot as 0 | 1);
          setStatus("active");
          return;
        }

        if (msg.type === "state") {
          setState(msg.state as BattleViewState);
          return;
        }

        if (msg.type === "ended") {
          setStatus("ended");
          return;
        }

        if (msg.type === "error") {
          setError(msg.message as string);
          setStatus("error");
        }
      } catch {
        // ignore
      }
    });

    ws.addEventListener("close", () => {
      if (status !== "ended") setStatus("idle");
    });

    ws.addEventListener("error", () => {
      setError("Could not connect to battle server (ws://localhost:8788)");
      setStatus("error");
    });

    return () => {
      ws.close();
      botRef.current?.close();
      wsRef.current = null;
      botRef.current = null;
    };
  }, [enabled, serverUrl]);

  return { status, state, battleId, playerSlot, error, sendCommand };
}
