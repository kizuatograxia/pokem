import React from "react";
import type { ActivePokemonView, PartySlotView } from "./types.js";

const HUD_FONT = "'Power Green', 'Courier New', monospace";
const NUMBER_SHEET = "/assets/sprites/ui/battle/icon_numbers.png";
const STATUS_SHEET = "/assets/sprites/ui/battle/icon_statuses.png";
const HP_SHEET = "/assets/sprites/ui/battle/overlay_hp.png";
const LV_SHEET = "/assets/sprites/ui/battle/overlay_lv.png";
const LINEUP_SHEET = "/assets/sprites/ui/battle/overlay_lineup.png";
const SHINY_ICON = "/assets/sprites/ui-pke/shiny.png";

const NAME_BASE_COLOR = "#484848";
const NAME_SHADOW_COLOR = "#b8b8b8";
const MALE_BASE_COLOR = "#3060d8";
const FEMALE_BASE_COLOR = "#f85828";

const STATUS_ICON_INDEX: Record<string, number> = {
  slp: 0,
  psn: 1,
  brn: 2,
  par: 3,
  frz: 4,
  tox: 7,
};

type SelectionMode = 0 | 1 | 2;

function battlerIndex(side: "player" | "foe", slot: number): number {
  return slot * 2 + (side === "foe" ? 1 : 0);
}

function databoxPosition(
  side: "player" | "foe",
  slot: number,
  sideSize: number,
): { left: number; top: number; baseX: number } {
  const index = battlerIndex(side, slot);
  const ret =
    side === "player"
      ? { left: 512 - 244, top: 384 - 192, baseX: 34 }
      : { left: -16, top: 36, baseX: 16 };

  if (sideSize === 2) {
    ret.left += [-12, 12, 0, 0][index] ?? 0;
    ret.top += [-20, -34, 34, 20][index] ?? 0;
  } else if (sideSize === 3) {
    ret.left += [-12, 12, -6, 6, 0, 0][index] ?? 0;
    ret.top += [-42, -46, 4, 0, 50, 46][index] ?? 0;
  }

  return ret;
}

function hpRatio(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, current / max));
}

function hpBarRow(ratio: number): number {
  if (ratio > 0.5) return 0;
  if (ratio > 0.2) return 1;
  return 2;
}

function hpBarWidth(current: number, max: number): number {
  const ratio = hpRatio(current, max);
  if (ratio <= 0) return 0;
  const width = Math.round((96 * ratio) / 2) * 2;
  return Math.max(2, Math.min(96, width));
}

function partyIconSrc(slot: PartySlotView | undefined): string {
  if (!slot || !slot.isRevealed) {
    return "/assets/sprites/ui/battle/icon_ball_empty.png";
  }

  if (slot.hpStatus === "fainted") {
    return "/assets/sprites/ui/battle/icon_ball_faint.png";
  }

  if (slot.status) {
    return "/assets/sprites/ui/battle/icon_ball_status.png";
  }

  return "/assets/sprites/ui/battle/icon_ball.png";
}

function genderSymbol(gender: ActivePokemonView["gender"]): string | null {
  if (gender === "M") return "\u2642";
  if (gender === "F") return "\u2640";
  return null;
}

function genderColors(gender: ActivePokemonView["gender"]): {
  color: string;
  shadowColor: string;
} {
  if (gender === "M") {
    return { color: MALE_BASE_COLOR, shadowColor: NAME_SHADOW_COLOR };
  }

  return { color: FEMALE_BASE_COLOR, shadowColor: NAME_SHADOW_COLOR };
}

function selectionAnimation(selectionMode: SelectionMode): string | undefined {
  if (selectionMode === 1 || selectionMode === 2) {
    return "battle-databox-bob 0.6s step-end infinite";
  }
  return undefined;
}

const SelectionStyles: React.FC = () => (
  <style>
    {`
      @keyframes battle-databox-bob {
        0%, 100% { transform: translateY(0px); }
        25% { transform: translateY(-2px); }
        75% { transform: translateY(2px); }
      }
    `}
  </style>
);

const ShadowText: React.FC<{
  children: React.ReactNode;
  color?: string;
  shadowColor?: string;
  fontSize?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  color = NAME_BASE_COLOR,
  shadowColor = NAME_SHADOW_COLOR,
  fontSize = 12,
  style,
}) => (
  <div
    style={{
      fontFamily: HUD_FONT,
      fontSize,
      lineHeight: `${fontSize}px`,
      color,
      textShadow: `1px 1px 0 ${shadowColor}`,
      whiteSpace: "nowrap",
      userSelect: "none",
      imageRendering: "pixelated",
      ...style,
    }}
  >
    {children}
  </div>
);

const SpriteNumberText: React.FC<{
  text: string;
  style?: React.CSSProperties;
  justifyContent?: React.CSSProperties["justifyContent"];
}> = ({ text, style, justifyContent = "flex-start" }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent,
      gap: 0,
      imageRendering: "pixelated",
      ...style,
    }}
  >
    {text.split("").map((char, index) => {
      const glyph = char === "/" ? 10 : Number(char);
      if (!Number.isFinite(glyph)) {
        return <div key={`${char}-${index}`} style={{ width: 4, height: 14 }} />;
      }

      return (
        <div
          key={`${char}-${index}`}
          style={{
            width: 16,
            height: 14,
            backgroundImage: `url(${NUMBER_SHEET})`,
            backgroundPosition: `-${glyph * 16}px 0px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            flexShrink: 0,
          }}
        />
      );
    })}
  </div>
);

const StatusIcon: React.FC<{
  status: ActivePokemonView["status"];
  left: number;
  top: number;
}> = ({ status, left, top }) => {
  if (!status) return null;
  const row = STATUS_ICON_INDEX[status];
  if (row === undefined) return null;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: 44,
        height: 16,
        backgroundImage: `url(${STATUS_SHEET})`,
        backgroundPosition: `0px -${row * 16}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
};

const HpBar: React.FC<{
  current: number;
  max: number;
  left: number;
  top: number;
}> = ({ current, max, left, top }) => {
  const ratio = hpRatio(current, max);
  const width = hpBarWidth(current, max);
  const row = hpBarRow(ratio);

  if (width <= 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height: 6,
        backgroundImage: `url(${HP_SHEET})`,
        backgroundPosition: `0px -${row * 6}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
};

const PartyLineup: React.FC<{
  party: PartySlotView[];
  side: "player" | "foe";
}> = ({ party = [], side }) => {
  const slots = Array.from({ length: 6 }, (_, index) => party[index]);
  const isPlayer = side === "player";
  const barX = isPlayer ? 264 : -192;
  const barY = isPlayer ? 242 : 114;
  const ballStartX = isPlayer ? 308 : 174;
  const ballY = isPlayer ? 212 : 84;
  const ballStep = isPlayer ? 32 : -32;

  return (
    <>
      <img
        src={LINEUP_SHEET}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: barX,
          top: barY,
          width: 440,
          height: 8,
          imageRendering: "pixelated",
          transform: isPlayer ? "scaleX(-1)" : undefined,
          transformOrigin: "center",
        }}
      />
      {slots.map((slot, index) => (
        <img
          key={index}
          src={partyIconSrc(slot)}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: ballStartX + index * ballStep,
            top: ballY,
            width: 30,
            height: 30,
            imageRendering: "pixelated",
          }}
        />
      ))}
    </>
  );
};

const DataboxName: React.FC<{
  pokemon: ActivePokemonView;
  left: number;
  top: number;
}> = ({ pokemon, left, top }) => {
  const symbol = genderSymbol(pokemon.gender);
  const colors = genderColors(pokemon.gender);

  return (
    <>
      <ShadowText
        style={{
          position: "absolute",
          left,
          top,
          width: 116,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {pokemon.name}
      </ShadowText>
      {symbol && (
        <ShadowText
          color={colors.color}
          shadowColor={colors.shadowColor}
          style={{
            position: "absolute",
            left: left + 118,
            top,
          }}
        >
          {symbol}
        </ShadowText>
      )}
    </>
  );
};

const DataboxLevel: React.FC<{
  level: number;
  left: number;
  top: number;
}> = ({ level, left, top }) => (
  <>
    <img
      src={LV_SHEET}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left,
        top,
        width: 22,
        height: 14,
        imageRendering: "pixelated",
      }}
    />
    <SpriteNumberText
      text={`${level}`}
      style={{
        position: "absolute",
        left: left + 22,
        top,
      }}
    />
  </>
);

const ShinyIcon: React.FC<{
  shiny: boolean;
  left: number;
  top: number;
}> = ({ shiny, left, top }) => {
  if (!shiny) return null;
  return (
    <img
      src={SHINY_ICON}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left,
        top,
        width: 16,
        height: 16,
        imageRendering: "pixelated",
      }}
    />
  );
};

const PlayerHpNumbers: React.FC<{
  current: number;
  max: number;
  left: number;
  top: number;
}> = ({ current, max, left, top }) => (
  <SpriteNumberText
    text={`${current}/${max}`}
    justifyContent="flex-end"
    style={{
      position: "absolute",
      left,
      top,
      width: 124,
      height: 14,
    }}
  />
);

const Databox: React.FC<{
  pokemon: ActivePokemonView | undefined;
  party: PartySlotView[];
  side: "player" | "foe";
  sideSize: number;
  slot: number;
  selectionMode?: SelectionMode;
}> = ({ pokemon, party, side, sideSize, slot, selectionMode = 0 }) => {
  if (!pokemon || pokemon.hpStatus === "fainted") {
    return null;
  }

  const thin = sideSize > 1;
  const { left, top, baseX } = databoxPosition(side, slot, sideSize);
  const background = thin
    ? side === "player"
      ? "/assets/sprites/ui/battle/databox_thin.png"
      : "/assets/sprites/ui/battle/databox_thin_foe.png"
    : side === "player"
      ? "/assets/sprites/ui/battle/databox_normal.png"
      : "/assets/sprites/ui/battle/databox_normal_foe.png";

  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: 260,
        height: thin || side === "foe" ? 62 : 84,
        animation: selectionAnimation(selectionMode),
      }}
    >
      <img
        src={background}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
        }}
      />
      <DataboxName pokemon={pokemon} left={baseX + 8} top={12} />
      <DataboxLevel level={pokemon.level} left={baseX + 140} top={16} />
      <ShinyIcon
        shiny={pokemon.shiny}
        left={baseX + (side === "foe" ? 206 : -6)}
        top={36}
      />
      <StatusIcon status={pokemon.status} left={baseX + 24} top={36} />
      <HpBar current={pokemon.hpCurrent} max={pokemon.hpMax} left={baseX + 102} top={40} />
      {!thin && side === "player" && (
        <PlayerHpNumbers
          current={pokemon.hpCurrent}
          max={pokemon.hpMax}
          left={baseX + 80}
          top={52}
        />
      )}
      {side === "player" && slot === 0 && <PartyLineup party={party} side="player" />}
      {side === "foe" && slot === 0 && <PartyLineup party={party} side="foe" />}
    </div>
  );
};

interface SideHudProps {
  active: ActivePokemonView[];
  party: PartySlotView[];
  side: "player" | "foe";
  sideSize: number;
  selection?: Partial<Record<number, 1 | 2>>;
}

const SideHud: React.FC<SideHudProps> = ({ active, party, side, sideSize, selection }) => (
  <>
    {Array.from({ length: sideSize }, (_, slot) => (
      <Databox
        key={`${side}-${slot}`}
        pokemon={active[slot]}
        party={party}
        side={side}
        sideSize={sideSize}
        slot={slot}
        selectionMode={selection?.[slot] ?? 0}
      />
    ))}
  </>
);

interface BattleHudProps {
  playerActive: ActivePokemonView[];
  foeActive: ActivePokemonView[];
  playerParty: PartySlotView[];
  foeParty: PartySlotView[];
  sideSize: number;
  selection?: {
    player: Partial<Record<number, 1 | 2>>;
    foe: Partial<Record<number, 1 | 2>>;
  };
}

export const BattleHud: React.FC<BattleHudProps> = ({
  playerActive,
  foeActive,
  playerParty,
  foeParty,
  sideSize,
  selection,
}) => (
  <>
    <SelectionStyles />
    <SideHud
      active={foeActive}
      party={foeParty}
      side="foe"
      sideSize={sideSize}
      selection={selection?.foe}
    />
    <SideHud
      active={playerActive}
      party={playerParty}
      side="player"
      sideSize={sideSize}
      selection={selection?.player}
    />
  </>
);
