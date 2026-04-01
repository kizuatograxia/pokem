import React from "react";

interface Props {
  playerSpeciesId: string;
  foeSpeciesId: string;
  playerFainted: boolean;
  foeFainted: boolean;
  indoor?: boolean;
}

function spritePath(speciesId: string, side: "front" | "back"): string {
  return `/assets/sprites/pokemon/${side}/${speciesId.toUpperCase()}.png`;
}

export const BattleField: React.FC<Props> = ({
  playerSpeciesId,
  foeSpeciesId,
  playerFainted,
  foeFainted,
  indoor = false,
}) => {
  const prefix = indoor ? "indoor1" : "field";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Background */}
      <img
        src={`/assets/battlebacks/${prefix}_bg.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 512,
          height: 192,
          imageRendering: "pixelated",
          objectFit: "cover",
        }}
      />

      {/* Foe platform */}
      <img
        src={`/assets/battlebacks/${prefix}_base1.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: 210,
          top: 100,
          imageRendering: "pixelated",
        }}
      />

      {/* Player platform */}
      <img
        src={`/assets/battlebacks/${prefix}_base0.png`}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: -10,
          top: 172,
          imageRendering: "pixelated",
        }}
      />

      {/* Foe sprite (front) */}
      {!foeFainted && (
        <img
          src={spritePath(foeSpeciesId, "front")}
          alt={foeSpeciesId}
          draggable={false}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/assets/sprites/pokemon/front/000.png";
          }}
          style={{
            position: "absolute",
            left: 292,
            top: 28,
            width: 96,
            height: 96,
            imageRendering: "pixelated",
            objectFit: "contain",
          }}
        />
      )}

      {/* Player sprite (back) */}
      {!playerFainted && (
        <img
          src={spritePath(playerSpeciesId, "back")}
          alt={playerSpeciesId}
          draggable={false}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/assets/sprites/pokemon/back/000.png";
          }}
          style={{
            position: "absolute",
            left: 46,
            top: 148,
            width: 96,
            height: 96,
            imageRendering: "pixelated",
            objectFit: "contain",
          }}
        />
      )}

      {/* Bottom fill */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 192,
          width: 512,
          height: 192,
          background: "#e8e8d0",
        }}
      />
    </div>
  );
};
