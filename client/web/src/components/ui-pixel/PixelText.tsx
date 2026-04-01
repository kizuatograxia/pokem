import React from "react";

const FONT_SIZE_BY_VARIANT = {
  xs: 10,
  sm: 14,
  base: 22,
  lg: 22,
  xl: 22,
} as const;

type PixelTextSize = keyof typeof FONT_SIZE_BY_VARIANT;

export interface PixelTextProps extends React.HTMLAttributes<HTMLDivElement> {
  color?: string;
  size?: PixelTextSize;
  fontSize?: number | string;
  lineHeight?: number | string;
}

function toCssSize(value: number | string): string | number {
  return typeof value === "number" ? `${value}px` : value;
}

export const PixelText: React.FC<PixelTextProps> = ({
  children,
  color = "#fff",
  size = "base",
  fontSize,
  lineHeight,
  style,
  ...props
}) => {
  const resolvedFontSize = fontSize ?? FONT_SIZE_BY_VARIANT[size];
  const resolvedLineHeight = lineHeight ?? 32;

  return (
    <div
      style={{
        color,
        fontFamily: "'Power Green', 'Courier New', monospace",
        fontSize: toCssSize(resolvedFontSize),
        lineHeight: toCssSize(resolvedLineHeight),
        textShadow: "2px 2px 0 #000",
        whiteSpace: "pre-line",
        userSelect: "none",
        imageRendering: "pixelated",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
