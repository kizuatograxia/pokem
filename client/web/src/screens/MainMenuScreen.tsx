import React, { useEffect, useState } from "react";
import { PixelFrame, PixelMenuList, PixelScreen, PixelText } from "../components/ui-pixel";
import { HubGame } from "../hub/HubGame";
import { BattleScreen } from "../battle/BattleScreen.js";
import { buildPackedTeam, DEFAULT_QUICK_BATTLE_TEAM } from "../battle/battleTeamCatalog.js";
import { usePersistentHubStorage } from "../hub/usePersistentHubStorage.js";

const MENU_ITEMS = ["New Game", "Battle Tower", "Quick Battle", "Options", "Quit Game"] as const;
const MENU_BACKGROUND = "/assets/maps/battle-tower-lobby-base.png";
const MENU_HELP = [
  "Start a new save flow.",
  "Visit the Battle Tower lobby and use Bill's PC to change your party.",
  "Battle using the party currently set in Bill's PC.",
  "Adjust game options.",
  "Return to the title screen.",
] as const;

export const MainMenuScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHub, setShowHub] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const { party, setParty, storageBoxes, setStorageBoxes } = usePersistentHubStorage();

  const partySpeciesKeys = party.flatMap((member) => (member ? [member.speciesKey] : []));
  const battleTeamPacked =
    buildPackedTeam(partySpeciesKeys) || buildPackedTeam([...DEFAULT_QUICK_BATTLE_TEAM]);

  const handleSelect = (item: (typeof MENU_ITEMS)[number]) => {
    if (item === "Quit Game") { onBack(); return; }
    if (item === "Battle Tower") { setShowHub(true); return; }
    if (item === "Quick Battle") { setShowBattle(true); return; }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showHub || showBattle) {
        if (e.key === "Escape") {
          setShowHub(false);
          setShowBattle(false);
        }
        return;
      }

      if (e.key === "ArrowUp") {
        setSelectedIndex((current) => (current > 0 ? current - 1 : MENU_ITEMS.length - 1));
      }

      if (e.key === "ArrowDown") {
        setSelectedIndex((current) => (current < MENU_ITEMS.length - 1 ? current + 1 : 0));
      }

      if (e.key === "Escape" || e.key === "Backspace") {
        onBack();
      }

      if (e.key === "Enter") {
        handleSelect(MENU_ITEMS[selectedIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack, selectedIndex, showHub, showBattle]);

  if (showBattle) {
    return (
      <BattleScreen
        onExit={() => setShowBattle(false)}
        playerTeamPacked={battleTeamPacked}
      />
    );
  }

  if (showHub) {
    return (
      <PixelScreen>
        <HubGame
          party={party}
          setParty={setParty}
          storageBoxes={storageBoxes}
          setStorageBoxes={setStorageBoxes}
        />
      </PixelScreen>
    );
  }

  return (
    <PixelScreen>
      <div
        style={{
          position: "relative",
          width: 512,
          height: 384,
          background: "#000",
        }}
      >
        <img
          src={MENU_BACKGROUND}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.15,
            imageRendering: "pixelated",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0.55) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
          }}
        >
          <PixelFrame width={200} height={116}>
            <PixelText
              size="xs"
              lineHeight={12}
              style={{
                marginBottom: 4,
                color: "#202018",
                textShadow: "1px 1px 0 #d0d0d0",
              }}
            >
              MAIN MENU
            </PixelText>
            <PixelMenuList
              items={MENU_ITEMS}
              selectedIndex={selectedIndex}
              onItemClick={(index) => {
                setSelectedIndex(index);
                handleSelect(MENU_ITEMS[index]);
              }}
            />
          </PixelFrame>
        </div>

        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
          }}
        >
          <PixelFrame width={248} height={82}>
            <PixelText
              size="xs"
              lineHeight={12}
              style={{
                marginBottom: 6,
                color: "#202018",
                textShadow: "1px 1px 0 #d0d0d0",
              }}
            >
              {MENU_ITEMS[selectedIndex]}
            </PixelText>
            <PixelText
              size="xs"
              lineHeight={12}
              style={{
                color: "#202018",
                textShadow: "1px 1px 0 #d0d0d0",
              }}
            >
              {MENU_HELP[selectedIndex]}
            </PixelText>
            {selectedIndex === 2 ? (
              <PixelText
                size="xs"
                lineHeight={12}
                style={{
                  marginTop: 8,
                  color: "#202018",
                  textShadow: "1px 1px 0 #d0d0d0",
                }}
              >
                {`Current party: ${partySpeciesKeys.length} Pokemon`}
              </PixelText>
            ) : null}
          </PixelFrame>
        </div>
      </div>
    </PixelScreen>
  );
};
