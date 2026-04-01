import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PixelButtonProps {
  children: ReactNode;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Retro game-style button with pixel borders and selection highlight.
 */
const PixelButton = ({ children, className, selected, onClick }: PixelButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "border-2 px-4 py-2 text-foreground transition-none",
        "focus:outline-none",
        selected
          ? "border-pixel-cyan bg-pixel-gray"
          : "border-pixel-gray-light bg-pixel-gray hover:border-pixel-cyan",
        className
      )}
    >
      {children}
    </button>
  );
};

export default PixelButton;
