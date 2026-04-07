import React from "react";
import loadingScreenSrc from "../assets/battle/loading-stitch.png";

interface BattleLoadingScreenProps {
  canActivate?: boolean;
  onActivate?: () => void;
  showError?: boolean;
  errorText?: string | null;
}

interface CropLayerProps {
  x: number;
  y: number;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}

interface PixelEffectProps {
  x: number;
  y: number;
  delayMs?: number;
  color: string;
  shadowColor: string;
  size?: number;
}

const VIEWPORT_WIDTH = 512;
const VIEWPORT_HEIGHT = 384;
const SOURCE_WIDTH = 1376;
const SOURCE_HEIGHT = 768;
const DISPLAY_SCALE = VIEWPORT_WIDTH / SOURCE_WIDTH;
const DISPLAY_HEIGHT = SOURCE_HEIGHT * DISPLAY_SCALE;
const DISPLAY_TOP = Math.floor((VIEWPORT_HEIGHT - DISPLAY_HEIGHT) / 2);
const BAR_TOP = 628;
const BAR_HEIGHT = 46;
const BAR_SEGMENTS = [
  { left: 292, width: 46, delayMs: 0 },
  { left: 349, width: 47, delayMs: 120 },
  { left: 407, width: 46, delayMs: 240 },
  { left: 464, width: 46, delayMs: 360 },
  { left: 521, width: 47, delayMs: 480 },
  { left: 579, width: 46, delayMs: 600 },
  { left: 636, width: 47, delayMs: 720 },
  { left: 694, width: 46, delayMs: 840 },
  { left: 751, width: 46, delayMs: 960 },
  { left: 808, width: 47, delayMs: 1080 },
  { left: 866, width: 46, delayMs: 1200 },
];
const SPEED_LINES = [
  { x: 941, y: 575, width: 32, delayMs: 0 },
  { x: 921, y: 596, width: 24, delayMs: 170 },
  { x: 958, y: 612, width: 18, delayMs: 340 },
];
const GOLD_ITEMS = [
  { x: 698, y: 528, width: 72, height: 86, delayMs: 0 },
  { x: 752, y: 503, width: 72, height: 86, delayMs: 180 },
  { x: 880, y: 499, width: 72, height: 86, delayMs: 360 },
];
const RED_ITEMS = [
  { x: 838, y: 553, width: 72, height: 72, delayMs: 110 },
  { x: 922, y: 560, width: 72, height: 72, delayMs: 330 },
];
const COIN_SPARKLES = [
  { x: 727, y: 545, delayMs: 0 },
  { x: 782, y: 519, delayMs: 280 },
  { x: 906, y: 516, delayMs: 560 },
  { x: 859, y: 576, delayMs: 160, color: "#ffd8d8", shadowColor: "#d94146" },
  { x: 946, y: 582, delayMs: 440, color: "#ffd8d8", shadowColor: "#d94146" },
];
const ELECTRIC_SPARKS = [
  { x: 987, y: 542, delayMs: 0 },
  { x: 1056, y: 520, delayMs: 240 },
  { x: 1086, y: 568, delayMs: 480 },
];

function CropLayer({ x, y, width, height, className, style }: CropLayerProps) {
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    >
      <img
        src={loadingScreenSrc}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: -x,
          top: -y,
          width: SOURCE_WIDTH,
          height: SOURCE_HEIGHT,
          imageRendering: "pixelated",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function PixelSparkle({
  x,
  y,
  delayMs = 0,
  color,
  shadowColor,
  size = 4,
}: PixelEffectProps) {
  return (
    <div
      className="battle-loading-sparkle"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: [
          `0 ${-size}px 0 0 ${color}`,
          `0 ${size}px 0 0 ${color}`,
          `${-size}px 0 0 0 ${color}`,
          `${size}px 0 0 0 ${color}`,
          `0 ${-size * 2}px 0 0 ${shadowColor}`,
          `0 ${size * 2}px 0 0 ${shadowColor}`,
          `${-size * 2}px 0 0 0 ${shadowColor}`,
          `${size * 2}px 0 0 0 ${shadowColor}`,
        ].join(", "),
        animationDelay: `${delayMs}ms`,
        pointerEvents: "none",
      }}
    />
  );
}

export const BattleLoadingScreen: React.FC<BattleLoadingScreenProps> = ({
  canActivate = false,
  onActivate,
  showError = false,
  errorText,
}) => {
  return (
    <>
      <style>{`
        @keyframes battleLoadingSegment {
          0%, 100% { opacity: 0.16; transform: translateY(0) scaleY(1); }
          18%, 42% { opacity: 0.98; transform: translateY(-1px) scaleY(1.04); }
          56% { opacity: 0.58; transform: translateY(0) scaleY(1.01); }
        }

        @keyframes battleLoadingShine {
          0%, 100% { opacity: 0.16; }
          50% { opacity: 0.42; }
        }

        @keyframes battleLoadingBarSweep {
          0% { transform: translateX(-88px); opacity: 0; }
          12% { opacity: 0.52; }
          78% { opacity: 0.52; }
          100% { transform: translateX(670px); opacity: 0; }
        }

        @keyframes battleLoadingBarGlow {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.24; }
        }

        @keyframes battleLoadingSparkle {
          0%, 100% { opacity: 0; transform: scale(0.6); }
          35% { opacity: 1; transform: scale(1); }
          55% { opacity: 0.85; transform: scale(1.35); }
          75% { opacity: 0; transform: scale(0.8); }
        }

        @keyframes battleLoadingPikaCharge {
          0%, 100% { opacity: 0.18; filter: brightness(1) saturate(1); }
          50% { opacity: 0.48; filter: brightness(1.12) saturate(1.22); }
        }

        @keyframes battleLoadingPikaRun {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(5px, -2px, 0); }
          50% { transform: translate3d(8px, 0, 0); }
          75% { transform: translate3d(3px, 2px, 0); }
        }

        @keyframes battleLoadingItemPulse {
          0%, 100% { opacity: 0.16; filter: brightness(1); }
          50% { opacity: 0.38; filter: brightness(1.2); }
        }

        @keyframes battleLoadingCoinFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          30% { transform: translate3d(0, -6px, 0) scale(1.03); }
          55% { transform: translate3d(0, -8px, 0) scale(1.05); }
          80% { transform: translate3d(0, -3px, 0) scale(1.02); }
        }

        @keyframes battleLoadingRedHop {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          28% { transform: translate3d(0, -4px, 0) scale(1.02); }
          52% { transform: translate3d(0, -7px, 0) scale(1.05); }
          78% { transform: translate3d(0, -2px, 0) scale(1.01); }
        }

        @keyframes battleLoadingSpeedLine {
          0% { opacity: 0; transform: translateX(0); }
          20% { opacity: 0.85; }
          100% { opacity: 0; transform: translateX(-26px); }
        }

        @keyframes battleLoadingPrompt {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .battle-loading-segment,
          .battle-loading-segment-shine,
          .battle-loading-sparkle,
          .battle-loading-pika-layer,
          .battle-loading-gold-item,
          .battle-loading-red-item,
          .battle-loading-speed-line,
          .battle-loading-prompt {
            animation: none !important;
          }
        }
      `}</style>

      <div
        onClick={canActivate ? onActivate : undefined}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: VIEWPORT_WIDTH,
          height: VIEWPORT_HEIGHT,
          overflow: "hidden",
          backgroundColor: "#53b1f4",
          imageRendering: "pixelated",
          userSelect: "none",
          cursor: canActivate ? "pointer" : "default",
        }}
      >
        <img
          src={loadingScreenSrc}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: VIEWPORT_WIDTH,
            height: VIEWPORT_HEIGHT,
            objectFit: "cover",
            opacity: 0.26,
            filter: "brightness(0.78) saturate(0.9)",
            imageRendering: "pixelated",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            top: DISPLAY_TOP,
            width: SOURCE_WIDTH,
            height: SOURCE_HEIGHT,
            transform: `scale(${DISPLAY_SCALE})`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
          }}
        >
          <img
            src={loadingScreenSrc}
            alt=""
            draggable={false}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: SOURCE_WIDTH,
              height: SOURCE_HEIGHT,
              imageRendering: "pixelated",
              pointerEvents: "none",
            }}
          />

          {BAR_SEGMENTS.map((segment) => (
            <div
              key={segment.left}
              className="battle-loading-segment"
              style={{
                position: "absolute",
                left: segment.left,
                top: BAR_TOP,
                width: segment.width,
                height: BAR_HEIGHT,
                background:
                  "linear-gradient(180deg, rgba(178,255,136,0.85) 0%, rgba(103,219,75,0.92) 54%, rgba(51,138,44,0.9) 100%)",
                opacity: 0.12,
                animation: "battleLoadingSegment 1320ms steps(3, end) infinite",
                animationDelay: `${segment.delayMs}ms`,
                pointerEvents: "none",
              }}
            >
              <div
                className="battle-loading-segment-shine"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: segment.width,
                  height: 10,
                  background: "rgba(255,255,255,0.32)",
                  animation: "battleLoadingShine 420ms steps(2, end) infinite",
                  animationDelay: `${segment.delayMs}ms`,
                  pointerEvents: "none",
                }}
              />
            </div>
          ))}

          <div
            style={{
              position: "absolute",
              left: 292,
              top: BAR_TOP + 4,
              width: 620,
              height: BAR_HEIGHT - 8,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 40%, rgba(132,255,118,0.16) 100%)",
                animation: "battleLoadingBarGlow 1400ms steps(4, end) infinite",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: -88,
                top: 0,
                width: 88,
                height: BAR_HEIGHT - 8,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.52) 45%, rgba(255,255,255,0) 100%)",
                mixBlendMode: "screen",
                animation: "battleLoadingBarSweep 1800ms linear infinite",
                willChange: "transform, opacity",
                pointerEvents: "none",
              }}
            />
          </div>

          {GOLD_ITEMS.map((item) => (
            <CropLayer
              key={`${item.x}-${item.y}`}
              className="battle-loading-gold-item"
              x={item.x}
              y={item.y}
              width={item.width}
              height={item.height}
              style={{
                opacity: 0.26,
                filter: "brightness(1.1) saturate(1.24)",
                transformOrigin: "center bottom",
                animation: [
                  "battleLoadingCoinFloat 980ms steps(4, end) infinite",
                  "battleLoadingItemPulse 980ms steps(3, end) infinite",
                ].join(", "),
                animationDelay: `${item.delayMs}ms, ${item.delayMs}ms`,
                willChange: "transform, opacity, filter",
              }}
            />
          ))}

          {RED_ITEMS.map((item) => (
            <CropLayer
              key={`${item.x}-${item.y}`}
              className="battle-loading-red-item"
              x={item.x}
              y={item.y}
              width={item.width}
              height={item.height}
              style={{
                opacity: 0.24,
                filter: "brightness(1.08) saturate(1.18)",
                transformOrigin: "center bottom",
                animation: [
                  "battleLoadingRedHop 1040ms steps(4, end) infinite",
                  "battleLoadingItemPulse 1040ms steps(3, end) infinite",
                ].join(", "),
                animationDelay: `${item.delayMs}ms, ${item.delayMs}ms`,
                willChange: "transform, opacity, filter",
              }}
            />
          ))}

          <CropLayer
            className="battle-loading-pika-layer"
            x={961}
            y={517}
            width={125}
            height={104}
            style={{
              opacity: 0.28,
              filter: "brightness(1.12) saturate(1.22)",
              transformOrigin: "center bottom",
              animation: [
                "battleLoadingPikaRun 520ms steps(3, end) infinite",
                "battleLoadingPikaCharge 680ms steps(2, end) infinite",
              ].join(", "),
              willChange: "transform, opacity, filter",
            }}
          />

          {SPEED_LINES.map((line) => (
            <div
              key={`${line.x}-${line.y}`}
              className="battle-loading-speed-line"
              style={{
                position: "absolute",
                left: line.x,
                top: line.y,
                width: line.width,
                height: 8,
                background: "#f4e27b",
                boxShadow: `0 4px 0 0 #d0a941`,
                opacity: 0,
                animation: "battleLoadingSpeedLine 540ms steps(3, end) infinite",
                animationDelay: `${line.delayMs}ms`,
                pointerEvents: "none",
              }}
            />
          ))}

          {COIN_SPARKLES.map((sparkle) => (
            <PixelSparkle
              key={`${sparkle.x}-${sparkle.y}`}
              x={sparkle.x}
              y={sparkle.y}
              delayMs={sparkle.delayMs}
              color={sparkle.color ?? "#fff4a3"}
              shadowColor={sparkle.shadowColor ?? "#f1b327"}
            />
          ))}

          {ELECTRIC_SPARKS.map((spark) => (
            <PixelSparkle
              key={`${spark.x}-${spark.y}`}
              x={spark.x}
              y={spark.y}
              delayMs={spark.delayMs}
              color="#fff7bf"
              shadowColor="#f4d62f"
              size={5}
            />
          ))}
        </div>

        {canActivate && (
          <div
            className="battle-loading-prompt"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 14,
              color: "#ffffff",
              fontFamily: '"Courier New", monospace',
              fontSize: 12,
              fontWeight: "bold",
              letterSpacing: 1,
              textAlign: "center",
              textShadow: "2px 2px 0 #000000",
              animation: "battleLoadingPrompt 920ms steps(2, end) infinite",
              pointerEvents: "none",
            }}
          >
            PRESS ENTER
          </div>
        )}

        {showError && (
          <div
            style={{
              position: "absolute",
              left: 36,
              right: 36,
              bottom: 34,
              padding: "8px 10px",
              border: "2px solid #120709",
              background: "rgba(255, 240, 240, 0.94)",
              color: "#6b1d21",
              fontFamily: '"Courier New", monospace',
              fontSize: 11,
              lineHeight: "14px",
              textAlign: "center",
              textShadow: "1px 1px 0 rgba(255,255,255,0.25)",
              boxShadow: "0 0 0 2px rgba(18, 7, 9, 0.12)",
              imageRendering: "pixelated",
            }}
          >
            {errorText ?? "Connection error"}
          </div>
        )}
      </div>
    </>
  );
};
