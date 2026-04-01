import React, { useEffect, useState } from "react";
import type { MoveCommand, SwitchCommand } from "../../../server/battle/src/view-model/types.js";
import { PixelScreen } from "../components/ui-pixel/PixelScreen.js";
import { BattleField } from "./BattleField.js";
import { FoeDatabox, PlayerDatabox } from "./BattleHud.js";
import {
  BattleCommandMenu,
  BattleMoveMenu,
  BattleMessageBox,
} from "./BattleMenu.js";
import { useBattleWs } from "./useBattleWs.js";

type MenuState = "command" | "fight" | null;

interface Props {
  onExit: () => void;
}

export const BattleScreen: React.FC<Props> = ({ onExit }) => {
  const [started, setStarted] = useState(false);
  const [menuState, setMenuState] = useState<MenuState>(null);
  const [commandIndex, setCommandIndex] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  const { status, state, playerSlot, battleId, error, sendCommand } =
    useBattleWs({ cpu: true, enabled: started });

  // Show latest message from queue
  useEffect(() => {
    if (!state) return;
    const msgs = state.messageQueue;
    if (msgs.length > 0) {
      setDisplayMessage(msgs[msgs.length - 1].text);
    }
  }, [state?.messageQueue]);

  // Open command menu when it's our turn
  useEffect(() => {
    if (!state || playerSlot === null) return;
    const req = state.pendingRequest;
    if (req?.kind === "move" && state.phase === "command") {
      setMenuState("command");
      setCommandIndex(0);
      setMoveIndex(0);
    } else if (req?.kind === "switch") {
      setMenuState("command");
    } else if (state.phase === "resolving" || state.phase === "preview") {
      setMenuState(null);
    }
  }, [state?.phase, state?.pendingRequest, playerSlot]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status === "ended") {
        if (e.key === "Enter" || e.key === "Escape") onExit();
        return;
      }

      if (!started && (e.key === "Enter" || e.key === " ")) {
        setStarted(true);
        return;
      }

      if (e.key === "Escape") {
        if (menuState === "fight") {
          setMenuState("command");
        } else {
          onExit();
        }
        return;
      }

      if (menuState === "command") {
        if (e.key === "ArrowRight") setCommandIndex((i) => (i === 1 ? 3 : i === 3 ? 1 : i < 2 ? i + 1 : 0));
        if (e.key === "ArrowLeft") setCommandIndex((i) => (i > 0 ? i - 1 : 3));
        if (e.key === "ArrowDown") setCommandIndex((i) => (i < 2 ? i + 2 : i - 2));
        if (e.key === "ArrowUp") setCommandIndex((i) => (i >= 2 ? i - 2 : i + 2));
        if (e.key === "Enter" || e.key === "z" || e.key === "Z") {
          if (commandIndex === 0) setMenuState("fight");
          else if (commandIndex === 3) onExit();
        }
        return;
      }

      if (menuState === "fight") {
        const moves = state?.pendingRequest?.slots[0]?.moves ?? [];
        const cols = 2;
        if (e.key === "ArrowRight") setMoveIndex((i) => Math.min(i + 1, moves.length - 1));
        if (e.key === "ArrowLeft") setMoveIndex((i) => Math.max(i - 1, 0));
        if (e.key === "ArrowDown") setMoveIndex((i) => Math.min(i + cols, moves.length - 1));
        if (e.key === "ArrowUp") setMoveIndex((i) => Math.max(i - cols, 0));
        if ((e.key === "Enter" || e.key === "z" || e.key === "Z") && moves[moveIndex] && !moves[moveIndex].disabled) {
          submitMove(moveIndex);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, started, menuState, commandIndex, moveIndex, state, playerSlot, battleId, onExit]);

  const submitMove = (idx: number) => {
    if (!state || playerSlot === null || !battleId) return;
    const moves = state.pendingRequest?.slots[0]?.moves ?? [];
    const move = moves[idx];
    if (!move || move.disabled) return;

    const cmd: MoveCommand = {
      kind: "move",
      battleId,
      playerSlot,
      activeSlot: 0,
      turn: state.turn,
      stateHash: "",
      moveIndex: move.index,
      mega: false,
      tera: false,
      dynamax: false,
    };
    sendCommand(cmd);
    setMenuState(null);
  };

  const submitSwitch = (position: number) => {
    if (!state || playerSlot === null || !battleId) return;
    const cmd: SwitchCommand = {
      kind: "switch",
      battleId,
      playerSlot,
      activeSlot: 0,
      turn: state.turn,
      stateHash: "",
      partyIndex: position,
    };
    sendCommand(cmd);
    setMenuState(null);
  };
  void submitSwitch; // reserved for POKEMON menu

  // ─── Derived view data ─────────────────────────────────────────────────────

  const ourSide = state && playerSlot !== null ? state.sides[playerSlot] : null;
  const foeSide = state && playerSlot !== null ? state.sides[playerSlot === 0 ? 1 : 0] : null;

  const ourActive = ourSide?.active[0] ?? null;
  const foeActive = foeSide?.active[0] ?? null;

  const moves = state?.pendingRequest?.slots[0]?.moves ?? [];

  // ─── Status message text ───────────────────────────────────────────────────

  let statusText = "";
  if (!started) statusText = "Press ENTER to battle!";
  else if (status === "connecting") statusText = "Connecting to battle server...";
  else if (status === "waiting") statusText = "Waiting for opponent...";
  else if (status === "active" && (!ourActive || !foeActive)) statusText = "Battle starting...";
  else if (status === "error") statusText = error ?? "Connection error";
  else if (status === "ended") {
    const w = state?.winnerName;
    statusText = w ? `${w} wins!\nPress ENTER to exit.` : "Draw!\nPress ENTER to exit.";
  } else if (displayMessage) {
    statusText = displayMessage;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PixelScreen>
      <div
        style={{
          position: "relative",
          width: 512,
          height: 384,
          overflow: "hidden",
          fontFamily: "monospace",
        }}
      >
        {/* Pre-battle / idle screen */}
        {(!started || !ourActive || !foeActive || status === "connecting" || status === "waiting" || status === "error") && (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, #1a2a3a 0%, #0a0a1a 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  color: "#fff",
                  fontWeight: "bold",
                  textShadow: "2px 2px 0 #000",
                  letterSpacing: 2,
                }}
              >
                BATTLE TOWER
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#d0d0d0",
                  textAlign: "center",
                  lineHeight: "16px",
                }}
              >
                {statusText}
              </div>
              {status === "error" && (
                <div style={{ fontSize: 9, color: "#f06060", textAlign: "center" }}>
                  Make sure the battle server is running:<br />
                  cd server/battle && npm start
                </div>
              )}
            </div>
          </>
        )}

        {/* Active battle */}
        {state && ourActive && foeActive && (
          <>
            <BattleField
              playerSpeciesId={ourActive.speciesId}
              foeSpeciesId={foeActive.speciesId}
              playerFainted={ourActive.hpStatus === "fainted"}
              foeFainted={foeActive.hpStatus === "fainted"}
            />

            <FoeDatabox pokemon={foeActive} />
            <PlayerDatabox pokemon={ourActive} />

            {/* Battle message or menus */}
            {menuState === "fight" ? (
              <BattleMoveMenu
                moves={moves}
                selectedIndex={moveIndex}
                onSelect={submitMove}
              />
            ) : menuState === "command" ? (
              <BattleCommandMenu
                selectedIndex={commandIndex}
                onSelect={(cmd) => {
                  if (cmd === "FIGHT") setMenuState("fight");
                  if (cmd === "RUN") onExit();
                }}
              />
            ) : (
              <BattleMessageBox text={statusText || "..."} />
            )}
          </>
        )}

        {/* Ended overlay */}
        {status === "ended" && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 300,
              width: 512,
              height: 84,
            }}
          >
            <BattleMessageBox text={statusText} />
          </div>
        )}
      </div>
    </PixelScreen>
  );
};
