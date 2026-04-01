import type { CSSProperties } from "react";

interface PokemonIconProps {
  iconSrc: string;
  scale?: number;
  frame?: number;
  style?: CSSProperties;
}

export function PokemonIcon({ iconSrc, scale = 1, frame = 0, style }: PokemonIconProps) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        width: 64 * scale,
        height: 64 * scale,
        backgroundImage: `url(${iconSrc})`,
        backgroundPosition: `${-frame * 64 * scale}px 0px`,
        backgroundRepeat: "no-repeat",
        backgroundSize: `${128 * scale}px ${64 * scale}px`,
        imageRendering: "pixelated",
        ...style,
      }}
    />
  );
}
