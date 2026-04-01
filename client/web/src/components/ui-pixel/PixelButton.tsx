import React from "react";

export interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  children,
  selected = false,
  className = "",
  type = "button",
  style,
  ...props
}) => {
  return (
    <button
      type={type}
      className={className}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        display: "block",
        width: 128,
        cursor: "pointer",
        textAlign: "left",
        appearance: "none",
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          position: "relative",
          width: 128,
          minHeight: 16,
          padding: "4px 8px 4px 24px",
          fontFamily: "'Courier New', monospace",
          fontSize: 8,
          lineHeight: "16px",
          color: "#fff",
          background: "transparent",
          imageRendering: "pixelated",
          boxSizing: "border-box",
          userSelect: "none",
        }}
      >
        {selected ? (
          <img
            src="/assets/sprites/ui/common/sel_arrow.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              position: "absolute",
              left: 4,
              top: "50%",
              transform: "translateY(-50%)",
              width: 12,
              height: 28,
              imageRendering: "pixelated",
              pointerEvents: "none",
            }}
          />
        ) : null}
        {children}
      </div>
    </button>
  );
};
