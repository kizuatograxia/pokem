import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BattleViewState,
  MultiChoiceCommand,
  MoveCommand,
  PlayerCommand,
  ShiftCommand,
  SlotChoice,
  SwitchCommand,
  TeamOrderCommand,
} from "./types.js";

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

function getDefaultServerUrl(): string {
  if (typeof window === "undefined") {
    return "ws://localhost:8788";
  }

  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${window.location.host}/battle-ws`;
}

function isEndedState(state: BattleViewState | null | undefined): boolean {
  return state?.phase === "ended";
}

function buildTeamPreviewCommand(
  state: BattleViewState,
  battleId: string,
  playerSlot: 0 | 1,
): TeamOrderCommand | null {
  const req = state.pendingRequest;
  if (req?.kind !== "team") return null;

  const order = req.switches.map((pokemon) => pokemon.position);
  if (order.length === 0) return null;

  return {
    kind: "team",
    battleId,
    playerSlot,
    order,
  };
}

// ─── CPU bot ─────────────────────────────────────────────────────────────────

function runCpuBot(serverUrl: string): WebSocket {
  const ws = new WebSocket(serverUrl);
  let slot: 0 | 1 | null = null;
  let battleId: string | null = null;
  let teamPreviewSubmitted = false;

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
        if (isEndedState(state)) {
          ws.close();
          return;
        }
        const req = state.pendingRequest;
        if (!req) return;

        if (req.kind === "team") {
          if (teamPreviewSubmitted) return;
          const cmd = buildTeamPreviewCommand(state, battleId, slot);
          if (!cmd) return;
          teamPreviewSubmitted = true;
          ws.send(JSON.stringify({ type: "command", ...cmd }));
          return;
        }

        if (req.kind === "move") {
          const choices: SlotChoice[] = [];
          for (const slotReq of req.slots) {
            const move = slotReq.moves.find((candidate) => !candidate.disabled) ?? slotReq.moves[0];
            if (move) {
              const choice: MoveCommand = {
                kind: "move",
                battleId,
                playerSlot: slot,
                activeSlot: slotReq.slot,
                turn: state.turn,
                stateHash: "",
                moveIndex: move.index,
                mega: false,
                tera: false,
                dynamax: false,
              };
              choices.push({ activeSlot: slotReq.slot, choice });
              continue;
            }

            const shiftChoice: ShiftCommand = {
              kind: "shift",
              battleId,
              playerSlot: slot,
              activeSlot: slotReq.slot,
              turn: state.turn,
              stateHash: "",
            };
            choices.push({ activeSlot: slotReq.slot, choice: shiftChoice });
          }
          if (choices.length === 0) return;
          if (choices.length === 1) {
            ws.send(JSON.stringify({ type: "command", ...choices[0].choice }));
            return;
          }
          const cmd: MultiChoiceCommand = {
            kind: "multi-choice",
            battleId,
            playerSlot: slot,
            turn: state.turn,
            stateHash: "",
            choices,
          };
          ws.send(JSON.stringify({ type: "command", ...cmd }));
          return;
        }

        if (req.kind === "switch") {
          const claimedBench = new Set<number>();
          const choices: SlotChoice[] = [];
          for (const slotReq of req.slots) {
            const sw = req.switches.find(
              (candidate) =>
                candidate.hpStatus === "alive" && !claimedBench.has(candidate.position),
            );
            if (!sw) return;
            claimedBench.add(sw.position);
            const choice: SwitchCommand = {
              kind: "switch",
              battleId,
              playerSlot: slot,
              activeSlot: slotReq.slot,
              turn: state.turn,
              stateHash: "",
              partyIndex: sw.position,
            };
            choices.push({ activeSlot: slotReq.slot, choice });
          }
          if (choices.length === 0) return;
          if (choices.length === 1) {
            ws.send(JSON.stringify({ type: "command", ...choices[0].choice }));
            return;
          }
          const cmd: MultiChoiceCommand = {
            kind: "multi-choice",
            battleId,
            playerSlot: slot,
            turn: state.turn,
            stateHash: "",
            choices,
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
  team?: string;
  cpu?: boolean;
  enabled?: boolean;
}): UseBattleWsResult {
  const { serverUrl = getDefaultServerUrl(), team, cpu = true, enabled = false } = opts;

  const [status, setStatus] = useState<BattleStatus>("idle");
  const [state, setState] = useState<BattleViewState | null>(null);
  const [battleId, setBattleId] = useState<string | null>(null);
  const [playerSlot, setPlayerSlot] = useState<0 | 1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const botRef = useRef<WebSocket | null>(null);
  const autoTeamPreviewKeyRef = useRef<string | null>(null);
  const latestStatusRef = useRef<BattleStatus>("idle");

  useEffect(() => {
    latestStatusRef.current = status;
  }, [status]);

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
      ws.send(JSON.stringify({ type: "join", team }));
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
          const nextState = msg.state as BattleViewState;
          setState(nextState);
          if (isEndedState(nextState)) {
            setStatus("ended");
            botRef.current?.close();
            botRef.current = null;
          }
          return;
        }

        if (msg.type === "ended") {
          setStatus("ended");
          botRef.current?.close();
          botRef.current = null;
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
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (latestStatusRef.current !== "ended") {
        setStatus("idle");
      }
    });

    ws.addEventListener("error", () => {
      setError(`Could not connect to battle server (${serverUrl})`);
      setStatus("error");
    });

    return () => {
      ws.close();
      botRef.current?.close();
      wsRef.current = null;
      botRef.current = null;
      autoTeamPreviewKeyRef.current = null;
    };
  }, [cpu, enabled, serverUrl, team]);

  useEffect(() => {
    if (!enabled || !state || !battleId || playerSlot === null) return;

    const cmd = buildTeamPreviewCommand(state, battleId, playerSlot);
    if (!cmd) return;

    const requestKey = `${battleId}:${playerSlot}:${cmd.order.join(",")}`;
    if (autoTeamPreviewKeyRef.current === requestKey) return;

    autoTeamPreviewKeyRef.current = requestKey;
    sendCommand(cmd);
  }, [enabled, state, battleId, playerSlot, sendCommand]);

  return { status, state, battleId, playerSlot, error, sendCommand };
}
