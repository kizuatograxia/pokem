import { useEffect, useState, type CSSProperties } from "react";

type Direction = "up" | "down" | "left" | "right";

function emitDirection(direction: Direction, active: boolean): void {
  window.dispatchEvent(
    new CustomEvent("hub:virtual:dir", {
      detail: { direction, active },
    }),
  );
}

function emitRun(active: boolean): void {
  window.dispatchEvent(
    new CustomEvent("hub:virtual:run", {
      detail: { active },
    }),
  );
}

function emitAction(): void {
  window.dispatchEvent(new CustomEvent("hub:virtual:action"));
}

const buttonBase: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(0,0,0,0.45)",
  color: "#fff",
  borderRadius: 8,
  fontFamily: "'Power Green', 'Courier New', monospace",
  fontSize: 11,
  lineHeight: "11px",
  userSelect: "none",
  touchAction: "none",
  boxSizing: "border-box",
};

export function HubMobileControls() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setEnabled(coarse || touch);

    return () => {
      emitDirection("up", false);
      emitDirection("down", false);
      emitDirection("left", false);
      emitDirection("right", false);
      emitRun(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "calc(10px + env(safe-area-inset-left, 0px))",
          bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          width: 120,
          height: 120,
          display: "grid",
          gridTemplateColumns: "40px 40px 40px",
          gridTemplateRows: "40px 40px 40px",
          pointerEvents: "auto",
        }}
      >
        <div />
        <button
          type="button"
          style={buttonBase}
          onPointerDown={() => emitDirection("up", true)}
          onPointerUp={() => emitDirection("up", false)}
          onPointerCancel={() => emitDirection("up", false)}
          onPointerLeave={() => emitDirection("up", false)}
        >
          ↑
        </button>
        <div />
        <button
          type="button"
          style={buttonBase}
          onPointerDown={() => emitDirection("left", true)}
          onPointerUp={() => emitDirection("left", false)}
          onPointerCancel={() => emitDirection("left", false)}
          onPointerLeave={() => emitDirection("left", false)}
        >
          ←
        </button>
        <div />
        <button
          type="button"
          style={buttonBase}
          onPointerDown={() => emitDirection("right", true)}
          onPointerUp={() => emitDirection("right", false)}
          onPointerCancel={() => emitDirection("right", false)}
          onPointerLeave={() => emitDirection("right", false)}
        >
          →
        </button>
        <div />
        <button
          type="button"
          style={buttonBase}
          onPointerDown={() => emitDirection("down", true)}
          onPointerUp={() => emitDirection("down", false)}
          onPointerCancel={() => emitDirection("down", false)}
          onPointerLeave={() => emitDirection("down", false)}
        >
          ↓
        </button>
        <div />
      </div>

      <div
        style={{
          position: "absolute",
          right: "calc(10px + env(safe-area-inset-right, 0px))",
          bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          gap: 8,
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          style={{ ...buttonBase, width: 56, height: 56, borderRadius: "50%" }}
          onPointerDown={(event) => {
            event.preventDefault();
            emitAction();
          }}
        >
          A
        </button>
        <button
          type="button"
          style={{ ...buttonBase, width: 56, height: 56, borderRadius: "50%" }}
          onPointerDown={() => emitRun(true)}
          onPointerUp={() => emitRun(false)}
          onPointerCancel={() => emitRun(false)}
          onPointerLeave={() => emitRun(false)}
        >
          RUN
        </button>
      </div>
    </div>
  );
}
