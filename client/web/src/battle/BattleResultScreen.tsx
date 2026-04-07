import React from "react";
import winScreenSrc from "../assets/battle/result-win.png";
import loseScreenSrc from "../assets/battle/result-lose.png";

type BattleResultScreenMode = "win" | "loss";

interface Props {
  result: BattleResultScreenMode;
  onExit: () => void;
}

const VIEWPORT_HEIGHT = 384;

const THEMES: Record<
  BattleResultScreenMode,
  {
    imageSrc: string;
    background: string;
    border: string;
    shadow: string;
    width: number;
  }
> = {
  win: {
    imageSrc: winScreenSrc,
    background: "#5da7ec",
    border: "#f8f8f8",
    shadow: "#184870",
    width: 346,
  },
  loss: {
    imageSrc: loseScreenSrc,
    background: "#465ea7",
    border: "#f8f0f8",
    shadow: "#282048",
    width: 336,
  },
};

export const BattleResultScreen: React.FC<Props> = ({ result, onExit }) => {
  const theme = THEMES[result];

  return (
    <div
      onClick={onExit}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: theme.background,
        overflow: "hidden",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 16px), linear-gradient(90deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 16px)",
          opacity: 0.35,
          imageRendering: "pixelated",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: theme.width,
          height: VIEWPORT_HEIGHT,
          boxShadow: `0 0 0 2px ${theme.border}, 0 0 0 4px ${theme.shadow}`,
          overflow: "hidden",
        }}
      >
        <img
          src={theme.imageSrc}
          alt=""
          draggable={false}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            imageRendering: "pixelated",
            userSelect: "none",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 12,
          textAlign: "center",
          fontFamily: "'Power Green', 'Courier New', monospace",
          fontSize: 12,
          lineHeight: "12px",
          color: "#ffffff",
          textShadow: "1px 1px 0 #000000",
          userSelect: "none",
          imageRendering: "pixelated",
          pointerEvents: "none",
        }}
      >
        PRESS ENTER TO CONTINUE
      </div>
    </div>
  );
};
