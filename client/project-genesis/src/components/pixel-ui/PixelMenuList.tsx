import { cn } from "@/lib/utils";
import PixelButton from "./PixelButton";
import PixelText from "./PixelText";

interface MenuItem {
  label: string;
  id: string;
}

interface PixelMenuListProps {
  items: MenuItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

/**
 * Vertically stacked game menu list with keyboard-style selection.
 */
const PixelMenuList = ({ items, selectedIndex, onSelect, className }: PixelMenuListProps) => {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map((item, i) => (
        <PixelButton
          key={item.id}
          selected={i === selectedIndex}
          onClick={() => onSelect(i)}
          className="w-full text-left"
        >
          <PixelText size="sm">{item.label}</PixelText>
        </PixelButton>
      ))}
    </div>
  );
};

export default PixelMenuList;
