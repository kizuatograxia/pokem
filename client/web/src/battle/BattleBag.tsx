import React from "react";
import {
  BAG_VISIBLE_ROWS,
  type BattleBagItem,
  type BattleBagPocket,
} from "./battleBagData.js";

const HUD_FONT = "'Power Green', 'Courier New', monospace";
const TEXT_BASE_COLOR = "#585850";
const TEXT_SHADOW_COLOR = "#a8b8b8";
const DESC_BASE_COLOR = "#f8f8f8";
const DESC_SHADOW_COLOR = "#000000";
const BAG_UI_ROOT = "/assets/sprites/ui/bag";
const ICON_POCKET = `${BAG_UI_ROOT}/icon_pocket.png`;
const ICON_SLIDER = `${BAG_UI_ROOT}/icon_slider.png`;
const CURSOR = `${BAG_UI_ROOT}/cursor.png`;

const LIST_LEFT = 180;
const LIST_TOP = 18;
const LIST_ROW_HEIGHT = 32;
const LIST_ROW_WIDTH = 282;
const POCKET_ICON_LEFT = 0;
const POCKET_ICON_TOP = 224;
const POCKET_ICON_WIDTH = 224;
const POCKET_ICON_HEIGHT = 48;

interface Props {
  pockets: BattleBagPocket[];
  pocketIndex: number;
  selectedIndex: number;
  onSelectPocket: (index: number) => void;
  onCyclePocket: (direction: -1 | 1) => void;
  onSelectIndex: (index: number) => void;
  onConfirmSelection: () => void;
}

function itemIconPath(item: BattleBagItem | null): string | null {
  if (!item) return null;
  return `/assets/sprites/items/${item.id.toUpperCase()}.png`;
}

function quantityLabel(item: BattleBagItem | null): string | null {
  if (!item || item.quantity === null) return null;
  return `x${String(item.quantity).padStart(3, " ")}`;
}

function visibleWindowStart(selectedIndex: number, entryCount: number): number {
  const maxTop = Math.max(0, entryCount - BAG_VISIBLE_ROWS);
  return Math.min(Math.max(0, selectedIndex - BAG_VISIBLE_ROWS + 1), maxTop);
}

const ShadowText: React.FC<{
  children: React.ReactNode;
  left: number;
  top: number;
  width?: number;
  align?: "left" | "center" | "right";
  color?: string;
  shadowColor?: string;
  fontSize?: number;
  lineHeight?: number;
}> = ({
  children,
  left,
  top,
  width,
  align = "left",
  color = TEXT_BASE_COLOR,
  shadowColor = TEXT_SHADOW_COLOR,
  fontSize = 20,
  lineHeight = 24,
}) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      fontFamily: HUD_FONT,
      fontSize,
      lineHeight: `${lineHeight}px`,
      color,
      textShadow: `2px 2px 0 ${shadowColor}`,
      textAlign: align,
      whiteSpace: "pre-wrap",
      userSelect: "none",
      imageRendering: "pixelated",
      pointerEvents: "none",
    }}
  >
    {children}
  </div>
);

const SpriteCrop: React.FC<{
  src: string;
  left: number;
  top: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
  cropX?: number;
  cropY?: number;
}> = ({ src, left, top, width, height, imageWidth, imageHeight, cropX = 0, cropY = 0 }) => (
  <div
    style={{
      position: "absolute",
      left,
      top,
      width,
      height,
      overflow: "hidden",
      pointerEvents: "none",
    }}
  >
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: "absolute",
        left: -cropX,
        top: -cropY,
        width: imageWidth,
        height: imageHeight,
        imageRendering: "pixelated",
      }}
    />
  </div>
);

export const BattleBagScreen: React.FC<Props> = ({
  pockets,
  pocketIndex,
  selectedIndex,
  onSelectPocket,
  onCyclePocket,
  onSelectIndex,
  onConfirmSelection,
}) => {
  const pocket = pockets[pocketIndex] ?? pockets[0];
  const entries: Array<BattleBagItem | null> = [...pocket.items, null];
  const entryCount = entries.length;
  const topIndex = visibleWindowStart(selectedIndex, entryCount);
  const selectedItem = selectedIndex < pocket.items.length ? pocket.items[selectedIndex] : null;
  const maxTop = Math.max(0, entryCount - BAG_VISIBLE_ROWS);
  const sliderTop = 42 + (maxTop === 0 ? 72 : Math.round((topIndex / maxTop) * 146));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
      }}
    >
      <img
        src={`${BAG_UI_ROOT}/bg_${pocket.id}.png`}
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
      <img
        src={`${BAG_UI_ROOT}/bag_${pocket.id}.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: 30,
          top: 20,
          width: 128,
          height: 128,
          imageRendering: "pixelated",
          pointerEvents: "none",
        }}
      />

      <SpriteCrop
        src={ICON_POCKET}
        left={POCKET_ICON_LEFT}
        top={POCKET_ICON_TOP + 24}
        width={POCKET_ICON_WIDTH}
        height={24}
        imageWidth={POCKET_ICON_WIDTH}
        imageHeight={POCKET_ICON_HEIGHT}
        cropY={24}
      />
      <SpriteCrop
        src={ICON_POCKET}
        left={POCKET_ICON_LEFT + pocketIndex * 28}
        top={POCKET_ICON_TOP}
        width={28}
        height={24}
        imageWidth={POCKET_ICON_WIDTH}
        imageHeight={POCKET_ICON_HEIGHT}
        cropX={pocketIndex * 28}
      />

      {pockets.map((entry, index) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onSelectPocket(index)}
          style={{
            position: "absolute",
            left: POCKET_ICON_LEFT + index * 28,
            top: POCKET_ICON_TOP,
            width: 28,
            height: 48,
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
          }}
        />
      ))}

      <button
        type="button"
        onClick={() => onCyclePocket(-1)}
        style={{
          position: "absolute",
          left: 0,
          top: 60,
          width: 40,
          height: 52,
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
        }}
      />
      <button
        type="button"
        onClick={() => onCyclePocket(1)}
        style={{
          position: "absolute",
          left: 118,
          top: 60,
          width: 40,
          height: 52,
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
        }}
      />

      <ShadowText left={12} top={186} width={148} align="center" fontSize={20}>
        {pocket.name}
      </ShadowText>

      {entries.slice(topIndex, topIndex + BAG_VISIBLE_ROWS).map((item, offset) => {
        const entryIndex = topIndex + offset;
        const selected = entryIndex === selectedIndex;
        const rowTop = LIST_TOP + offset * LIST_ROW_HEIGHT;

        return (
          <button
            key={item?.id ?? "close"}
            type="button"
            onClick={() => {
              if (selected) {
                onConfirmSelection();
                return;
              }
              onSelectIndex(entryIndex);
            }}
            style={{
              position: "absolute",
              left: LIST_LEFT,
              top: rowTop,
              width: LIST_ROW_WIDTH,
              height: LIST_ROW_HEIGHT,
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
            }}
          >
            {selected && (
              <img
                src={CURSOR}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left: 0,
                  top: -2,
                  width: LIST_ROW_WIDTH,
                  height: 34,
                  imageRendering: "pixelated",
                  pointerEvents: "none",
                }}
              />
            )}
            <ShadowText left={18} top={6} width={184} fontSize={20} lineHeight={20}>
              {item ? item.name : "CLOSE BAG"}
            </ShadowText>
            {quantityLabel(item) && (
              <ShadowText
                left={208}
                top={6}
                width={58}
                align="right"
                fontSize={20}
                lineHeight={20}
              >
                {quantityLabel(item)}
              </ShadowText>
            )}
          </button>
        );
      })}

      {entryCount > BAG_VISIBLE_ROWS && (
        <SpriteCrop
          src={ICON_SLIDER}
          left={470}
          top={sliderTop}
          width={36}
          height={38}
          imageWidth={72}
          imageHeight={76}
          cropX={36}
        />
      )}

      {selectedItem && itemIconPath(selectedItem) && (
        <img
          src={itemIconPath(selectedItem) ?? undefined}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: 24,
            top: 312,
            width: 48,
            height: 48,
            imageRendering: "pixelated",
            pointerEvents: "none",
          }}
        />
      )}

      <ShadowText
        left={72}
        top={272}
        width={416}
        color={DESC_BASE_COLOR}
        shadowColor={DESC_SHADOW_COLOR}
        fontSize={18}
        lineHeight={24}
      >
        {selectedItem?.description ?? "Close the Bag and return to battle."}
      </ShadowText>
    </div>
  );
};
