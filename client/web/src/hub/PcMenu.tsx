import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { PixelDialogueBox, PixelFrame, PixelMenuList, PixelText } from "../components/ui-pixel";
import type { HubPartyMember, HubStorageBox } from "./pcStorageData";
import { StorageOverlay, type StorageMode } from "./StorageOverlay";
import { dispatchHubDialogueClosed } from "./hubEvents";

const MENU_ITEMS = [
  "ORGANIZE BOXES",
  "WITHDRAW POKEMON",
  "DEPOSIT POKEMON",
  "SEE YA!",
] as const;

const MENU_HELP = [
  "Organize the Pokemon in Boxes and in your party.",
  "Move Pokemon stored in Boxes to your party.",
  "Store Pokemon in your party in Boxes.",
  "Return to the previous menu.",
] as const;

interface PcMenuProps {
  party: Array<HubPartyMember | null>;
  setParty: Dispatch<SetStateAction<Array<HubPartyMember | null>>>;
  storageBoxes: HubStorageBox[];
  setStorageBoxes: Dispatch<SetStateAction<HubStorageBox[]>>;
}

function getPartyCount(party: Array<HubPartyMember | null>): number {
  return party.filter((member): member is HubPartyMember => member !== null).length;
}

function hasPartySpace(party: Array<HubPartyMember | null>): boolean {
  return party.some((member) => member === null);
}

export function PcMenu({ party, setParty, storageBoxes, setStorageBoxes }: PcMenuProps) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeHelpText = useMemo(
    () => message ?? MENU_HELP[selectedIndex],
    [message, selectedIndex],
  );

  const resetMenu = () => {
    setOpen(true);
    setSelectedIndex(0);
    setStorageMode(null);
    setMessage(null);
  };

  const collapseMenu = () => {
    setOpen(false);
    setSelectedIndex(0);
    setStorageMode(null);
    setMessage(null);
  };

  const closePc = () => {
    collapseMenu();
    dispatchHubDialogueClosed();
  };

  useEffect(() => {
    const handleOpen = () => {
      resetMenu();
    };

    window.addEventListener("hub:pc", handleOpen);
    return () => window.removeEventListener("hub:pc", handleOpen);
  }, []);

  useEffect(() => {
    const handleClosed = () => {
      collapseMenu();
    };

    window.addEventListener("hub:dialogue:closed", handleClosed);
    return () => window.removeEventListener("hub:dialogue:closed", handleClosed);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (storageMode) {
        return;
      }

      if (message) {
        if (
          event.key === "Escape" ||
          event.key === "Enter" ||
          event.key === "x" ||
          event.key === "X" ||
          event.key === "z" ||
          event.key === "Z"
        ) {
          event.preventDefault();
          event.stopPropagation();
          setMessage(null);
        }
        return;
      }

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

      if (event.key === "Escape" || event.key === "x" || event.key === "X") {
        event.preventDefault();
        event.stopPropagation();
        closePc();
        return;
      }

      if (event.key !== "Enter" && event.key !== "z" && event.key !== "Z") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (selectedIndex === 0) {
        setStorageMode("organize");
        return;
      }

      if (selectedIndex === 1) {
        if (!hasPartySpace(party)) {
          setMessage("Your party is full!");
          return;
        }

        setStorageMode("withdraw");
        return;
      }

      if (selectedIndex === 2) {
        if (getPartyCount(party) <= 1) {
          setMessage("Can't deposit the last Pokemon!");
          return;
        }

        setStorageMode("deposit");
        return;
      }

      closePc();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [message, open, party, selectedIndex, storageMode]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {open && storageMode === null ? (
        <>
          <div
            style={{
              position: "absolute",
              top: 44,
              right: 18,
            }}
          >
            <PixelFrame width={240} height={120}>
              <PixelText
                size="xs"
                lineHeight={12}
                style={{
                  marginBottom: 6,
                  color: "#202018",
                  textShadow: "1px 1px 0 #d0d0d0",
                }}
              >
                BILL'S PC
              </PixelText>
              <PixelMenuList
                items={MENU_ITEMS}
                selectedIndex={selectedIndex}
                onItemClick={setSelectedIndex}
              />
            </PixelFrame>
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <PixelDialogueBox
              text={activeHelpText}
              textColor="#1f1f17"
              textShadow="1px 1px 0 #d8d8c8"
            />
          </div>
        </>
      ) : null}

      {open && storageMode !== null ? (
        <StorageOverlay
          open
          mode={storageMode}
          onClose={() => setStorageMode(null)}
          party={party}
          setParty={setParty}
          storageBoxes={storageBoxes}
          setStorageBoxes={setStorageBoxes}
        />
      ) : null}
    </div>
  );
}
