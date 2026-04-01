import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import PixelText from "./PixelText";

interface PixelDialogueBoxProps {
  children: ReactNode;
  className?: string;
}

/**
 * Bottom-anchored dialogue/message box in classic JRPG style.
 */
const PixelDialogueBox = ({ children, className }: PixelDialogueBoxProps) => {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 border-t-2 border-pixel-white bg-pixel-black/90 px-4 py-3",
        className
      )}
    >
      <PixelText size="sm">{children}</PixelText>
    </div>
  );
};

export default PixelDialogueBox;
