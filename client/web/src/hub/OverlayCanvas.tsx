import type { CSSProperties, ReactNode } from "react";

interface OverlayCanvasProps {
  children: ReactNode;
  backgroundSrc?: string;
  style?: CSSProperties;
}

export function OverlayCanvas({ children, backgroundSrc, style }: OverlayCanvasProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        background: "rgba(0, 0, 0, 0.72)",
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          width: 512,
          height: 384,
          overflow: "hidden",
        }}
      >
        {backgroundSrc ? (
          <img
            src={backgroundSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              imageRendering: "pixelated",
            }}
          />
        ) : null}
        {children}
      </div>
    </div>
  );
}
