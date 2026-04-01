import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PixelTextProps {
  children: ReactNode;
  className?: string;
  size?: "xs" | "sm" | "base" | "lg" | "xl";
  shadow?: boolean;
}

const sizeMap = {
  xs: "text-[8px]",
  sm: "text-[10px]",
  base: "text-xs",
  lg: "text-sm",
  xl: "text-base",
};

/**
 * Text component using Press Start 2P with optional pixel shadow.
 */
const PixelText = ({ children, className, size = "base", shadow = true }: PixelTextProps) => {
  return (
    <span
      className={cn(
        sizeMap[size],
        shadow && "pixel-text-shadow",
        "leading-relaxed",
        className
      )}
    >
      {children}
    </span>
  );
};

export default PixelText;
