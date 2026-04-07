import React from "react";
import type { PartySlotView } from "./types.js";

const HUD_FONT = "'Power Green', 'Courier New', monospace";
const PARTY_BG = "/assets/sprites/ui/party/bg.png";
const PARTY_HP_SHEET = "/assets/sprites/ui/party/overlay_hp.png";
const PARTY_LV = "/assets/sprites/ui/party/overlay_lv.png";
const PARTY_ITEM = "/assets/sprites/ui/party/icon_item.png";
const PARTY_STATUS = "/assets/sprites/ui/common/statuses.png";

const TEXT_BASE_COLOR = "#f8f8f8";
const TEXT_SHADOW_COLOR = "#282828";
const MALE_BASE_COLOR = "#0070f8";
const MALE_SHADOW_COLOR = "#78b8e8";
const FEMALE_BASE_COLOR = "#e82010";
const FEMALE_SHADOW_COLOR = "#f8a8b8";
const STATUS_ICON_INDEX: Record<string, number> = {
  slp: 0,
  psn: 1,
  brn: 2,
  par: 3,
  frz: 4,
  tox: 7,
};

const PANEL_POSITIONS = [
  { left: 0, top: 0 },
  { left: 256, top: 16 },
  { left: 0, top: 96 },
  { left: 256, top: 112 },
  { left: 0, top: 192 },
  { left: 256, top: 208 },
] as const;

function hpBarRow(slot: PartySlotView): number {
  if (slot.hpPercent > 50) return 0;
  if (slot.hpPercent > 25) return 1;
  return 2;
}

function hpBarWidth(slot: PartySlotView): number {
  if (slot.hpPercent <= 0) return 0;
  const width = Math.round((96 * slot.hpPercent) / 100 / 2) * 2;
  return Math.max(2, Math.min(96, width));
}

function iconPath(slot: PartySlotView): string {
  const folder = slot.shiny ? "icons-shiny" : "icons";
  return `/assets/sprites/pokemon/${folder}/${slot.speciesId.toUpperCase()}.png`;
}

function genderStyle(gender: PartySlotView["gender"]): {
  color: string;
  shadowColor: string;
} {
  if (gender === "M") {
    return { color: MALE_BASE_COLOR, shadowColor: MALE_SHADOW_COLOR };
  }
  return { color: FEMALE_BASE_COLOR, shadowColor: FEMALE_SHADOW_COLOR };
}

function panelPath(
  index: number,
  selected: boolean,
  fainted: boolean,
  active: boolean,
): string {
  const shape = index === 0 ? "round" : "rect";
  if (active) {
    return `/assets/sprites/ui/party/panel_${shape}_${selected ? "swap_sel" : "swap"}.png`;
  }
  if (fainted) {
    return `/assets/sprites/ui/party/panel_${shape}_${selected ? "faint_sel" : "faint"}.png`;
  }
  return `/assets/sprites/ui/party/panel_${shape}${selected ? "_sel" : ""}.png`;
}

function hpBackPath(fainted: boolean, active: boolean): string {
  if (active) return "/assets/sprites/ui/party/overlay_hp_back_swap.png";
  if (fainted) return "/assets/sprites/ui/party/overlay_hp_back_faint.png";
  return "/assets/sprites/ui/party/overlay_hp_back.png";
}

const ShadowText: React.FC<{
  children: React.ReactNode;
  left: number;
  top: number;
  align?: "left" | "right" | "center";
  width?: number;
  color?: string;
  shadowColor?: string;
  fontSize?: number;
}> = ({
  children,
  left,
  top,
  align = "left",
  width,
  color = TEXT_BASE_COLOR,
  shadowColor = TEXT_SHADOW_COLOR,
  fontSize = 14,
}) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      fontFamily: HUD_FONT,
      fontSize,
      lineHeight: `${fontSize}px`,
      color,
      textShadow: `1px 1px 0 ${shadowColor}`,
      textAlign: align,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      userSelect: "none",
      imageRendering: "pixelated",
    }}
  >
    {children}
  </div>
);

const PartyPanel: React.FC<{
  slot: PartySlotView;
  index: number;
  selected: boolean;
  active: boolean;
  onSelect: (index: number) => void;
}> = ({ slot, index, selected, active, onSelect }) => {
  const position = PANEL_POSITIONS[index];
  const symbol = slot.gender === "N" ? null : slot.gender === "M" ? "\u2642" : "\u2640";
  const hpWidth = hpBarWidth(slot);
  const statusIndex =
    slot.hpStatus === "fainted"
      ? 6
      : slot.status
        ? STATUS_ICON_INDEX[slot.status] ?? -1
        : -1;

  return (
    <div
      onClick={() => onSelect(index)}
      style={{
        position: "absolute",
        left: position.left,
        top: position.top,
        width: 256,
        height: 98,
        cursor: "pointer",
      }}
    >
      <img
        src={panelPath(index, selected, slot.hpStatus === "fainted", active)}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: 256,
          height: 98,
          imageRendering: "pixelated",
        }}
      />
      <img
        src={selected ? "/assets/sprites/ui/party/icon_ball_sel.png" : "/assets/sprites/ui/party/icon_ball.png"}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: 10,
          top: 0,
          width: 44,
          height: 56,
          imageRendering: "pixelated",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 28,
          top: 8,
          width: 64,
          height: 64,
          backgroundImage: `url(${iconPath(slot)})`,
          backgroundPosition: "0px 0px",
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated",
        }}
      />
      {slot.item && (
        <img
          src={PARTY_ITEM}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: 62,
            top: 48,
            width: 16,
            height: 16,
            imageRendering: "pixelated",
          }}
        />
      )}
      <ShadowText left={96} top={22} width={124}>
        {slot.name}
      </ShadowText>
      {symbol && (
        <ShadowText
          left={224}
          top={22}
          color={genderStyle(slot.gender).color}
          shadowColor={genderStyle(slot.gender).shadowColor}
        >
          {symbol}
        </ShadowText>
      )}
      <img
        src={PARTY_LV}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: 20,
          top: 70,
          width: 22,
          height: 14,
          imageRendering: "pixelated",
        }}
      />
      <ShadowText left={42} top={68} fontSize={12}>
        {slot.level}
      </ShadowText>
      <img
        src={hpBackPath(slot.hpStatus === "fainted", active)}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: 96,
          top: 50,
          width: 138,
          height: 14,
          imageRendering: "pixelated",
        }}
      />
      {hpWidth > 0 && slot.hpStatus !== "fainted" && (
        <div
          style={{
            position: "absolute",
            left: 128,
            top: 52,
            width: hpWidth,
            height: 8,
            backgroundImage: `url(${PARTY_HP_SHEET})`,
            backgroundPosition: `0px -${hpBarRow(slot) * 8}px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
          }}
        />
      )}
      {statusIndex >= 0 && (
        <div
          style={{
            position: "absolute",
            left: 78,
            top: 68,
            width: 44,
            height: 16,
            backgroundImage: `url(${PARTY_STATUS})`,
            backgroundPosition: `0px -${statusIndex * 16}px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
          }}
        />
      )}
      {slot.hpCurrent !== null && slot.hpMax !== null && (
        <ShadowText left={118} top={66} width={106} align="right" fontSize={12}>
          {`${slot.hpCurrent}/${slot.hpMax}`}
        </ShadowText>
      )}
    </div>
  );
};

const CancelButton: React.FC<{
  selected: boolean;
  onSelect: () => void;
}> = ({ selected, onSelect }) => (
  <img
    onClick={onSelect}
    src={selected ? "/assets/sprites/ui/party/icon_cancel_sel.png" : "/assets/sprites/ui/party/icon_cancel.png"}
    alt=""
    draggable={false}
    style={{
      position: "absolute",
      left: 398,
      top: 328,
      width: 112,
      height: 48,
      imageRendering: "pixelated",
      cursor: "pointer",
    }}
  />
);

interface BattlePartyScreenProps {
  party: PartySlotView[];
  selectedIndex: number;
  canCancel: boolean;
  activePositions: Set<number>;
  helpText: string;
  onSelectIndex: (index: number) => void;
  onConfirmSelection: () => void;
}

export const BattlePartyScreen: React.FC<BattlePartyScreenProps> = ({
  party,
  selectedIndex,
  canCancel,
  activePositions,
  helpText,
  onSelectIndex,
  onConfirmSelection,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
    }}
  >
    <img
      src={PARTY_BG}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        inset: 0,
        width: 512,
        height: 384,
        imageRendering: "pixelated",
      }}
    />
    {party.slice(0, 6).map((slot, index) => {
      if (!slot) return null;
      return (
        <PartyPanel
          key={`${slot.position}-${slot.name}-${index}`}
          slot={slot}
          index={index}
          selected={selectedIndex === index}
          active={activePositions.has(index)}
          onSelect={(index) => {
            onSelectIndex(index);
            onConfirmSelection();
          }}
        />
      );
    })}
    {canCancel && (
      <CancelButton
        selected={selectedIndex === 6}
        onSelect={() => {
          onSelectIndex(6);
          onConfirmSelection();
        }}
      />
    )}
    <div
      style={{
        position: "absolute",
        left: 14,
        bottom: 10,
        minWidth: 220,
        maxWidth: 340,
        padding: "6px 10px",
        background: "rgba(40, 40, 48, 0.72)",
        border: "2px solid rgba(248, 248, 248, 0.28)",
        color: TEXT_BASE_COLOR,
        textShadow: `1px 1px 0 ${TEXT_SHADOW_COLOR}`,
        fontFamily: HUD_FONT,
        fontSize: 14,
        lineHeight: "16px",
        whiteSpace: "pre-wrap",
        userSelect: "none",
      }}
    >
      {helpText}
    </div>
  </div>
);
