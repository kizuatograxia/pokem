import type { HTMLAttributes } from "react";
import { PkeWindow } from "./PkeWindow";

export interface PixelFrameProps extends HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
}

export function PixelFrame({
  children,
  width = 200,
  height = 100,
  style,
  className,
  ...props
}: PixelFrameProps) {
  return (
    <PkeWindow width={width} height={height} style={style} className={className} {...props}>
      {children}
    </PkeWindow>
  );
}
