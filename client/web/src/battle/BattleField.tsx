import React from "react";
import type { ActivePokemonView } from "./types.js";

interface BattleSelectionState {
  player: Partial<Record<number, 1 | 2>>;
  foe: Partial<Record<number, 1 | 2>>;
}

interface Props {
  playerActive: ActivePokemonView[];
  foeActive: ActivePokemonView[];
  sideSize: number;
  selection?: BattleSelectionState;
  indoor?: boolean;
}

const SCREEN_WIDTH = 512;
const BATTLE_HEIGHT = 288;
const PLAYER_BASE_CENTER = { x: 128, y: 304 };
const FOE_BASE_CENTER = { x: 384, y: 176 };
const SPRITE_SIZE = 96;
const SHADOW_WIDTH = 136;
const SHADOW_HEIGHT = 24;
const SHADOW_SPRITE = "/assets/sprites/pokemon/shadow";

function battlerIndex(side: "player" | "foe", slot: number): number {
  return slot * 2 + (side === "foe" ? 1 : 0);
}

function battlerPosition(
  side: "player" | "foe",
  slot: number,
  sideSize: number,
): { x: number; y: number } {
  const index = battlerIndex(side, slot);
  const base =
    side === "player"
      ? { x: PLAYER_BASE_CENTER.x, y: PLAYER_BASE_CENTER.y }
      : { x: FOE_BASE_CENTER.x, y: FOE_BASE_CENTER.y };

  if (sideSize === 2) {
    base.x += [-48, 48, 32, -32][index] ?? 0;
    base.y += [0, 0, 16, -16][index] ?? 0;
  } else if (sideSize === 3) {
    base.x += [-80, 80, 0, 0, 80, -80][index] ?? 0;
    base.y += [0, 0, 8, -8, 16, -16][index] ?? 0;
  }

  return base;
}

function spritePath(pokemon: ActivePokemonView, side: "front" | "back"): string {
  const shinyFolder =
    pokemon.shiny && side === "front"
      ? "front-shiny"
      : pokemon.shiny && side === "back"
        ? "back-shiny"
        : side;
  return `/assets/sprites/pokemon/${shinyFolder}/${pokemon.speciesId.toUpperCase()}.png`;
}

function selectionAnimation(selectionMode: 1 | 2 | undefined): string | undefined {
  if (selectionMode === 1) return "battle-battler-bob 0.6s step-end infinite";
  if (selectionMode === 2) return "battle-battler-target 0.3s step-end infinite";
  return undefined;
}

const SelectionStyles: React.FC = () => (
  <style>
    {`
      @keyframes battle-battler-bob {
        0%, 100% { transform: translateY(0px); }
        25% { transform: translateY(2px); }
        75% { transform: translateY(-2px); }
      }

      @keyframes battle-battler-target {
        0%, 33% { opacity: 0; }
        34%, 100% { opacity: 1; }
      }
    `}
  </style>
);

const BattleSprite: React.FC<{
  pokemon: ActivePokemonView | undefined;
  side: "player" | "foe";
  slot: number;
  sideSize: number;
  selectionMode?: 1 | 2;
}> = ({ pokemon, side, slot, sideSize, selectionMode }) => {
  if (!pokemon || pokemon.hpStatus === "fainted") {
    return null;
  }

  const position = battlerPosition(side, slot, sideSize);

  return (
    <>
      <img
        src={SHADOW_SPRITE}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: position.x - SHADOW_WIDTH / 2,
          top: position.y - 12,
          width: SHADOW_WIDTH,
          height: SHADOW_HEIGHT,
          imageRendering: "pixelated",
          animation: selectionAnimation(selectionMode),
        }}
      />
      <img
        src={spritePath(pokemon, side === "foe" ? "front" : "back")}
        alt={pokemon.speciesId}
        draggable={false}
        onError={(event) => {
          event.currentTarget.src =
            side === "foe"
              ? "/assets/sprites/pokemon/front/000.png"
              : "/assets/sprites/pokemon/back/000.png";
        }}
        style={{
          position: "absolute",
          left: position.x - SPRITE_SIZE / 2,
          top: position.y - SPRITE_SIZE,
          width: SPRITE_SIZE,
          height: SPRITE_SIZE,
          imageRendering: "pixelated",
          objectFit: "contain",
          animation: selectionAnimation(selectionMode),
        }}
      />
    </>
  );
};

export const BattleField: React.FC<Props> = ({
  playerActive,
  foeActive,
  sideSize,
  selection,
  indoor = false,
}) => {
  const prefix = indoor ? "indoor1" : "field";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <SelectionStyles />
      <img
        src={`/assets/battlebacks/${prefix}_bg.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SCREEN_WIDTH,
          height: BATTLE_HEIGHT,
          imageRendering: "pixelated",
          objectFit: "fill",
        }}
      />

      <img
        src={`/assets/battlebacks/${prefix}_base1.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: FOE_BASE_CENTER.x - 128,
          top: FOE_BASE_CENTER.y - 64,
          imageRendering: "pixelated",
        }}
      />

      <img
        src={`/assets/battlebacks/${prefix}_base0.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: PLAYER_BASE_CENTER.x - 256,
          top: PLAYER_BASE_CENTER.y - 64,
          imageRendering: "pixelated",
        }}
      />

      {Array.from({ length: sideSize }, (_, slot) => (
        <BattleSprite
          key={`foe-${slot}`}
          pokemon={foeActive[slot]}
          side="foe"
          slot={slot}
          sideSize={sideSize}
          selectionMode={selection?.foe[slot]}
        />
      ))}

      {Array.from({ length: sideSize }, (_, slot) => (
        <BattleSprite
          key={`player-${slot}`}
          pokemon={playerActive[slot]}
          side="player"
          slot={slot}
          sideSize={sideSize}
          selectionMode={selection?.player[slot]}
        />
      ))}
    </div>
  );
};
