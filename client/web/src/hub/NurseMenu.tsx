import { useEffect, useState } from "react";
import { PixelFrame, PixelMenuList, PixelText } from "../components/ui-pixel";
import { dispatchHubDialogueClosed, dispatchHubHeal, dispatchHubInteract } from "./hubEvents";

const MENU_ITEMS = ["Yes", "No"] as const;

export function NurseMenu() {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const closeMenu = () => {
    setOpen(false);
    setSelectedIndex(0);
  };

  const confirmSelection = () => {
    if (selectedIndex === 0) {
      closeMenu();
      dispatchHubHeal();
      dispatchHubInteract({
        npcId: "nurse-healed",
        text: ["Your Pokemon\nhave been healed!"],
      });
      return;
    }

    closeMenu();
    dispatchHubDialogueClosed();
  };

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setSelectedIndex(0);
    };

    window.addEventListener("hub:nurse-menu", handleOpen);
    return () => window.removeEventListener("hub:nurse-menu", handleOpen);
  }, []);

  useEffect(() => {
    const handleClosed = () => {
      closeMenu();
    };

    window.addEventListener("hub:dialogue:closed", handleClosed);
    return () => window.removeEventListener("hub:dialogue:closed", handleClosed);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((current) => (current > 0 ? current - 1 : MENU_ITEMS.length - 1));
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((current) => (current < MENU_ITEMS.length - 1 ? current + 1 : 0));
        return;
      }

      if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
        event.preventDefault();
        event.stopPropagation();
        confirmSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {open ? (
        <div
          style={{
            position: "absolute",
            top: 112,
            right: 24,
          }}
        >
          <PixelFrame width={160} height={80}>
            <PixelText
              size="xs"
              lineHeight={12}
              style={{
                marginBottom: 6,
                color: "#202018",
                textShadow: "1px 1px 0 #d0d0d0",
              }}
            >
              HEAL YOUR TEAM?
            </PixelText>
            <PixelMenuList items={MENU_ITEMS} selectedIndex={selectedIndex} onItemClick={setSelectedIndex} />
          </PixelFrame>
        </div>
      ) : null}
    </div>
  );
}
