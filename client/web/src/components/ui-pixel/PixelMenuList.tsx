import React from "react";
import { PixelText } from "./PixelText";

type PixelMenuTextSize = "xs" | "sm" | "base" | "lg" | "xl";

export interface PixelMenuListProps {
  items: readonly string[];
  onItemClick?: (index: number) => void;
  selectedIndex: number;
  itemSize?: PixelMenuTextSize;
  itemLineHeight?: number | string;
  itemPadding?: string;
}

export const PixelMenuList: React.FC<PixelMenuListProps> = ({
  items,
  onItemClick,
  selectedIndex,
  itemSize = "xs",
  itemLineHeight = 12,
  itemPadding = "2px 8px 2px 20px",
}) => {
  return (
    <div role="menu" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          role="menuitem"
          onClick={() => onItemClick?.(index)}
          style={{
            position: "relative",
            width: "100%",
            border: "none",
            background: "transparent",
            padding: 0,
            margin: 0,
            cursor: "pointer",
            textAlign: "left",
            appearance: "none",
          }}
        >
          {selectedIndex === index ? (
            <img
              src="/assets/sprites/ui/common/sel_arrow.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: 12,
                height: 28,
                imageRendering: "pixelated",
                pointerEvents: "none",
              }}
            />
          ) : null}
          <PixelText
            size={itemSize}
            lineHeight={itemLineHeight}
            style={{
              minHeight: 12,
              padding: itemPadding,
              boxSizing: "border-box",
              color: "#202018",
              textShadow: "1px 1px 0 #d0d0d0",
            }}
          >
            {item}
          </PixelText>
        </button>
      ))}
    </div>
  );
};
