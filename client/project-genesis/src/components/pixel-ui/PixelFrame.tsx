import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PixelFrameProps {
  children: ReactNode;
  className?: string;
  borderColor?: string;
  bgColor?: string;
}

/**
 * Rectangular pixel-art frame with hard 2px borders.
 * Used as the base framing primitive for panels, menus, and dialogue boxes.
 */
const PixelFrame = ({ children, className, borderColor, bgColor }: PixelFrameProps) => {
  return (
    <div
      className={cn(
        "border-2 border-pixel-white",
        className
      )}
      style={{
        borderColor: borderColor,
        backgroundColor: bgColor,
      }}
    >
      {children}
    </div>
  );
};

export default PixelFrame;
