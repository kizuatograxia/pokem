import React from "react";
import type { MoveRequestOption } from "./types.js";

const HUD_FONT = "'Power Green', 'Courier New', monospace";
const MESSAGE_BASE_COLOR = "#505058";
const MESSAGE_SHADOW_COLOR = "#a0a0a8";
const COMMAND_SHEET = "/assets/sprites/ui/battle/cursor_command.png";
const FIGHT_SHEET = "/assets/sprites/ui/battle/cursor_fight.png";
const MEGA_SHEET = "/assets/sprites/ui/battle/cursor_mega.png";
const SHIFT_SHEET = "/assets/sprites/ui/battle/cursor_shift.png";
const TARGET_SHEET = "/assets/sprites/ui/battle/cursor_target.png";
const TYPES_SHEET = "/assets/sprites/ui/common/types.png";
const BUTTON_HEIGHT = 46;
const TARGET_BUTTON_HEIGHT = 46;
const TARGET_BUTTON_WIDTH = 236;
const TARGET_BUTTON_WIDTH_SMALL = 170;
const TARGET_TEXT_BASE_COLOR = "#f0f8e0";
const TARGET_TEXT_SHADOW_COLOR = "#404040";

const COMMAND_ROWS = {
  FIGHT: 0,
  POKEMON: 1,
  BAG: 2,
  RUN: 3,
  CALL: 4,
  CANCEL: 9,
} as const;

const TYPE_ROWS: Record<string, number> = {
  NORMAL: 0,
  FIGHTING: 1,
  FLYING: 2,
  POISON: 3,
  GROUND: 4,
  ROCK: 5,
  BUG: 6,
  GHOST: 7,
  STEEL: 8,
  SHADOW: 9,
  FIRE: 10,
  WATER: 11,
  GRASS: 12,
  ELECTRIC: 13,
  PSYCHIC: 14,
  ICE: 15,
  DRAGON: 16,
  DARK: 17,
  FAIRY: 18,
};

const PP_COLORS = {
  red: { color: "#f84848", shadowColor: "#883030" },
  orange: { color: "#f88820", shadowColor: "#904818" },
  yellow: { color: "#f8c000", shadowColor: "#906800" },
  normal: { color: MESSAGE_BASE_COLOR, shadowColor: MESSAGE_SHADOW_COLOR },
};

const COMMANDS = ["FIGHT", "BAG", "POKEMON"] as const;
export type BattleCommandAction =
  | (typeof COMMANDS)[number]
  | "RUN"
  | "CALL"
  | "CANCEL";

export interface BattleTargetOption {
  screenIndex: number;
  targetLoc: number;
  label: string;
  side: "ally" | "foe";
  slotIndex: number;
}

function typeRow(typeId: string | undefined): number {
  if (!typeId) return TYPE_ROWS.NORMAL;
  return TYPE_ROWS[typeId.toUpperCase()] ?? TYPE_ROWS.NORMAL;
}

function ppColors(current: number, max: number): {
  color: string;
  shadowColor: string;
} {
  if (current <= 0) return PP_COLORS.red;
  const ratio = max > 0 ? current / max : 0;
  if (ratio <= 0.25) return PP_COLORS.orange;
  if (ratio <= 0.5) return PP_COLORS.yellow;
  return PP_COLORS.normal;
}

const BoxText: React.FC<{
  children: React.ReactNode;
  color?: string;
  shadowColor?: string;
  fontSize?: number;
  lineHeight?: number;
  style?: React.CSSProperties;
}> = ({
  children,
  color = MESSAGE_BASE_COLOR,
  shadowColor = MESSAGE_SHADOW_COLOR,
  fontSize = 20,
  lineHeight = 28,
  style,
}) => (
  <div
    style={{
      fontFamily: HUD_FONT,
      fontSize,
      lineHeight: `${lineHeight}px`,
      color,
      textShadow: `2px 2px 0 ${shadowColor}`,
      whiteSpace: "pre-wrap",
      userSelect: "none",
      imageRendering: "pixelated",
      ...style,
    }}
  >
    {children}
  </div>
);

export const BattleMessageBox: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 288,
      width: 512,
      height: 96,
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
        pointerEvents: "none",
      }}
    />
    <BoxText
      style={{
        position: "absolute",
        left: 16,
        top: 12,
        right: 16,
      }}
    >
      {text}
    </BoxText>
  </div>
);

interface CommandMenuProps {
  selectedIndex: number;
  pokemonName?: string;
  fourthAction: "RUN" | "CALL" | "CANCEL";
  onSelect: (cmd: BattleCommandAction) => void;
}

export const BattleCommandMenu: React.FC<CommandMenuProps> = ({
  selectedIndex,
  pokemonName,
  fourthAction,
  onSelect,
}) => {
  const commandGrid: BattleCommandAction[] = [...COMMANDS, fourthAction];

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 288,
        width: 512,
        height: 96,
      }}
    >
      <img
        src="/assets/sprites/ui/battle/overlay_command.png"
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
          objectFit: "fill",
          pointerEvents: "none",
        }}
      />
      <BoxText
        fontSize={18}
        lineHeight={24}
        style={{
          position: "absolute",
          left: 18,
          top: 12,
          width: 200,
        }}
      >
        {`What will\n${pokemonName ?? "POKEMON"} do?`}
      </BoxText>
      {commandGrid.map((command, index) => (
        <div
          key={`${command}-${index}`}
          onClick={() => onSelect(command)}
          style={{
            position: "absolute",
            left: 252 + (index % 2) * 126,
            top: 6 + Math.floor(index / 2) * 42,
            width: 130,
            height: BUTTON_HEIGHT,
            cursor: "pointer",
            backgroundImage: `url(${COMMAND_SHEET})`,
            backgroundPosition: `-${selectedIndex === index ? 130 : 0}px -${
              COMMAND_ROWS[command] * BUTTON_HEIGHT
            }px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            zIndex: 2,
          }}
        />
      ))}
    </div>
  );
};

const MoveTypeIcon: React.FC<{ typeId: string }> = ({ typeId }) => (
  <div
    style={{
      position: "absolute",
      left: 416,
      top: 20,
      width: 64,
      height: 28,
      backgroundImage: `url(${TYPES_SHEET})`,
      backgroundPosition: `0px -${typeRow(typeId) * 28}px`,
      backgroundRepeat: "no-repeat",
      imageRendering: "pixelated",
    }}
  />
);

const MoveButton: React.FC<{
  move: MoveRequestOption | null;
  selected: boolean;
  index: number;
  onSelect: (index: number) => void;
}> = ({ move, selected, index, onSelect }) => {
  const row = typeRow(move?.typeId);
  const disabled = !move || move.disabled;

  return (
    <div
      onClick={() => {
        if (!disabled) onSelect(index);
      }}
      style={{
        position: "absolute",
        left: 4 + (index % 2) * 188,
        top: 6 + Math.floor(index / 2) * 42,
        width: 192,
        height: BUTTON_HEIGHT,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        backgroundImage: `url(${FIGHT_SHEET})`,
        backgroundPosition: `-${selected ? 192 : 0}px -${row * BUTTON_HEIGHT}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        zIndex: 2,
      }}
    >
      <BoxText
        fontSize={16}
        lineHeight={18}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 12,
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {move?.name ?? "-"}
      </BoxText>
    </div>
  );
};

interface MoveMenuProps {
  moves: MoveRequestOption[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  megaMode?: 0 | 1 | 2;
  onToggleMega?: () => void;
  shiftMode?: 0 | 1;
  onShift?: () => void;
}

export const BattleMoveMenu: React.FC<MoveMenuProps> = ({
  moves,
  selectedIndex,
  onSelect,
  megaMode = 0,
  onToggleMega,
  shiftMode = 0,
  onShift,
}) => {
  const moveSlots = Array.from({ length: 4 }, (_, index) => moves[index] ?? null);
  const selectedMove = moveSlots[selectedIndex] ?? moveSlots.find(Boolean) ?? null;
  const selectedMoveColors = selectedMove
    ? ppColors(selectedMove.pp, selectedMove.maxPp)
    : PP_COLORS.normal;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 288,
        width: 512,
        height: 96,
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
          pointerEvents: "none",
        }}
      />
      {moveSlots.map((move, index) => (
        <MoveButton
          key={`${move?.id ?? "empty"}-${index}`}
          move={move}
          selected={selectedIndex === index}
          index={index}
          onSelect={onSelect}
        />
      ))}
      {selectedMove && <MoveTypeIcon typeId={selectedMove.typeId} />}
      {selectedMove && (
        <BoxText
          color={selectedMoveColors.color}
          shadowColor={selectedMoveColors.shadowColor}
          fontSize={16}
          lineHeight={18}
          style={{
            position: "absolute",
            left: 390,
            top: 56,
            width: 116,
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          {`PP: ${selectedMove.pp}/${selectedMove.maxPp}`}
        </BoxText>
      )}
      {shiftMode > 0 && (
        <div
          onClick={onShift}
          style={{
            position: "absolute",
            left: 4,
            top: -46,
            width: 196,
            height: 46,
            cursor: onShift ? "pointer" : "default",
            backgroundImage: `url(${SHIFT_SHEET})`,
            backgroundPosition: "0px 0px",
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            zIndex: 3,
          }}
        />
      )}
      {megaMode > 0 && (
        <div
          onClick={onToggleMega}
          style={{
            position: "absolute",
            left: shiftMode > 0 ? 204 : 120,
            top: -46,
            width: 150,
            height: 46,
            cursor: onToggleMega ? "pointer" : "default",
            backgroundImage: `url(${MEGA_SHEET})`,
            backgroundPosition: `0px -${(megaMode - 1) * 46}px`,
            backgroundRepeat: "no-repeat",
            imageRendering: "pixelated",
            zIndex: 3,
          }}
        />
      )}
    </div>
  );
};

interface TargetMenuProps {
  options: BattleTargetOption[];
  selectedScreenIndex: number;
  sideSizes: [number, number];
  onSelect: (targetLoc: number) => void;
}

export const BattleTargetMenu: React.FC<TargetMenuProps> = ({
  options,
  selectedScreenIndex,
  sideSizes,
  onSelect,
}) => {
  const optionMap = new Map(options.map((option) => [option.screenIndex, option]));
  const maxIndex =
    sideSizes[0] > sideSizes[1] ? (sideSizes[0] - 1) * 2 : sideSizes[1] * 2 - 1;
  const smallButtons = Math.max(sideSizes[0], sideSizes[1]) > 2;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 288,
        width: 512,
        height: 96,
      }}
    >
      {Array.from({ length: maxIndex + 1 }, (_, screenIndex) => {
        const numButtons = sideSizes[screenIndex % 2];
        if (numButtons <= Math.floor(screenIndex / 2)) {
          return null;
        }

        const inc =
          screenIndex % 2 === 0
            ? Math.floor(screenIndex / 2)
            : numButtons - 1 - Math.floor(screenIndex / 2);
        const width = smallButtons ? TARGET_BUTTON_WIDTH_SMALL : TARGET_BUTTON_WIDTH;
        const baseX = smallButtons
          ? 170 - [0, 82, 166][numButtons - 1]
          : 138 - [0, 116][numButtons - 1];
        const left = baseX + (width - 4) * inc;
        const top = 6 + (TARGET_BUTTON_HEIGHT - 4) * ((screenIndex + 1) % 2);
        const option = optionMap.get(screenIndex);
        const buttonType =
          option !== undefined
            ? ((screenIndex % 2 === 0 ? 1 : 2) * 2) + (smallButtons ? 1 : 0)
            : 0;

        if (!option) {
          return null;
        }

        return (
          <div
            key={screenIndex}
            onClick={() => onSelect(option.targetLoc)}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height: TARGET_BUTTON_HEIGHT,
              cursor: "pointer",
              backgroundImage: `url(${TARGET_SHEET})`,
              backgroundPosition: `-${
                selectedScreenIndex === screenIndex ? TARGET_BUTTON_WIDTH : 0
              }px -${buttonType * TARGET_BUTTON_HEIGHT}px`,
              backgroundRepeat: "no-repeat",
              imageRendering: "pixelated",
              zIndex: 2,
            }}
          >
            <BoxText
              color={TARGET_TEXT_BASE_COLOR}
              shadowColor={TARGET_TEXT_SHADOW_COLOR}
              fontSize={18}
              lineHeight={20}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 10,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {option.label}
            </BoxText>
          </div>
        );
      })}
    </div>
  );
};
