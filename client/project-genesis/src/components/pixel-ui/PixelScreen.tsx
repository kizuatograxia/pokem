import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PixelScreenProps {
  children: ReactNode;
  className?: string;
}

/**
 * Full-viewport game screen container.
 * Maintains 4:3 aspect ratio centered on screen with black letterboxing.
 */
const PixelScreen = ({ children, className }: PixelScreenProps) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-pixel-black overflow-hidden">
      <div
        className={cn(
          "relative w-full max-w-[768px] aspect-[4/3] overflow-hidden",
          className
        )}
        style={{ imageRendering: "pixelated" }}
      >
        {children}
      </div>
    </div>
  );
};

export default PixelScreen;
