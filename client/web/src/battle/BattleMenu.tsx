import React from "react";
import type { MoveRequestOption } from "../../../server/battle/src/view-model/types.js";

// ─── Message box ──────────────────────────────────────────────────────────────

export const BattleMessageBox: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 300,
      width: 512,
      height: 84,
    }}
  >
    <img
      src="/assets/sprites/ui/battle/overlay_message.png"
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        objectFit: "fill",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 16,
        top: 12,
        right: 16,
        fontSize: 12,
        fontFamily: "monospace",
        color: "#181818",
        lineHeight: "18px",
        whiteSpace: "pre-wrap",
      }}
    >
      {text}
    </div>
  </div>
);

// ─── Command menu ─────────────────────────────────────────────────────────────

const COMMANDS = ["FIGHT", "POKEMON", "BAG", "RUN"] as const;
type Command = (typeof COMMANDS)[number];

interface CommandMenuProps {
  selectedIndex: number;
  onSelect: (cmd: Command) => void;
}

export const BattleCommandMenu: React.FC<CommandMenuProps> = ({ selectedIndex, onSelect }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 300,
      width: 512,
      height: 84,
    }}
  >
    <img
      src="/assets/sprites/ui/battle/overlay_message.png"
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        objectFit: "fill",
      }}
    />
    <img
      src="/assets/sprites/ui/battle/overlay_command.png"
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        right: 0,
        top: 0,
        height: "100%",
        imageRendering: "pixelated",
        objectFit: "contain",
        objectPosition: "right",
      }}
    />
    <div
      style={{
        position: "absolute",
        right: 8,
        top: 8,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "4px 16px",
        width: 190,
      }}
    >
      {COMMANDS.map((cmd, i) => (
        <div
          key={cmd}
          onClick={() => onSelect(cmd)}
          style={{
            fontSize: 12,
            fontFamily: "monospace",
            color: "#181818",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 4px",
            background: selectedIndex === i ? "rgba(0,0,0,0.1)" : "transparent",
          }}
        >
          {selectedIndex === i && (
            <span style={{ color: "#e00020" }}>▶</span>
          )}
          {cmd}
        </div>
      ))}
    </div>
  </div>
);

// ─── Type colors ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  electric: "#f8d030",
  grass: "#78c850",
  ice: "#98d8d8",
  fighting: "#c03028",
  poison: "#a040a0",
  ground: "#e0c068",
  flying: "#a890f0",
  psychic: "#f85888",
  bug: "#a8b820",
  rock: "#b8a038",
  ghost: "#705898",
  dragon: "#7038f8",
  dark: "#705848",
  steel: "#b8b8d0",
  fairy: "#ee99ac",
};

// ─── Move menu ────────────────────────────────────────────────────────────────

interface MoveMenuProps {
  moves: MoveRequestOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export const BattleMoveMenu: React.FC<MoveMenuProps> = ({ moves, selectedIndex, onSelect }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 254,
      width: 512,
      height: 130,
    }}
  >
    <img
      src="/assets/sprites/ui/battle/overlay_fight.png"
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        objectFit: "fill",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 8,
        top: 8,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 8px",
        width: 310,
      }}
    >
      {moves.map((move, i) => {
        const typeColor = TYPE_COLORS[move.id] ?? "#a8a878";
        const isDisabled = move.disabled;
        return (
          <div
            key={move.id}
            onClick={() => !isDisabled && onSelect(i)}
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: isDisabled ? "#a0a0a0" : "#181818",
              cursor: isDisabled ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 6px",
              background: selectedIndex === i ? "rgba(0,0,0,0.12)" : "transparent",
              borderRadius: 2,
            }}
          >
            {selectedIndex === i && !isDisabled && (
              <span style={{ color: "#e00020" }}>▶</span>
            )}
            <div>
              <div style={{ fontWeight: "bold" }}>{move.name}</div>
              <div
                style={{
                  fontSize: 9,
                  color: "#fff",
                  background: typeColor,
                  borderRadius: 2,
                  padding: "0 3px",
                  display: "inline-block",
                  marginTop: 1,
                }}
              >
                {move.id.toUpperCase()}
              </div>
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontSize: 9,
                color: "#606060",
                textAlign: "right",
              }}
            >
              {move.pp}/{move.maxPp}
            </div>
          </div>
        );
      })}
    </div>
    {moves[selectedIndex] && (
      <div
        style={{
          position: "absolute",
          right: 12,
          top: 12,
          width: 180,
          fontSize: 10,
          fontFamily: "monospace",
          color: "#181818",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 9, color: "#606060" }}>PP</div>
        <div style={{ fontWeight: "bold" }}>
          {moves[selectedIndex].pp}/{moves[selectedIndex].maxPp}
        </div>
      </div>
    )}
  </div>
);
