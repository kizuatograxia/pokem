import React, { useEffect, useMemo, useState } from "react";
import { PixelFrame, PixelText, PixelScreen } from "../components/ui-pixel";
import {
  BATTLE_TEAM_CATALOG,
  BATTLE_TEAM_ENTRY_BY_ID,
  buildPackedTeam,
  DEFAULT_QUICK_BATTLE_TEAM,
} from "./battleTeamCatalog.js";

interface QuickBattleSetupScreenProps {
  onBack: () => void;
  onStart: (packedTeam: string) => void;
}

const BACKGROUND_SRC = "/assets/maps/battle-tower-lobby-base.png";
const FONT_STACK = '"Courier New", monospace';
const SLOT_COUNT = 6;
const VISIBLE_CATALOG_COUNT = 7;

function createDefaultSelection(): string[] {
  return [...DEFAULT_QUICK_BATTLE_TEAM];
}

export const QuickBattleSetupScreen: React.FC<QuickBattleSetupScreenProps> = ({
  onBack,
  onStart,
}) => {
  const [catalogIndex, setCatalogIndex] = useState(0);
  const [slotIndex, setSlotIndex] = useState(0);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(createDefaultSelection);

  const highlightedEntry = BATTLE_TEAM_CATALOG[catalogIndex] ?? BATTLE_TEAM_CATALOG[0];
  const selectedEntries = useMemo(
    () => selectedTeamIds.map((teamId) => BATTLE_TEAM_ENTRY_BY_ID.get(teamId) ?? null),
    [selectedTeamIds],
  );
  const visibleCatalogStart = Math.min(
    Math.max(0, catalogIndex - Math.floor(VISIBLE_CATALOG_COUNT / 2)),
    Math.max(0, BATTLE_TEAM_CATALOG.length - VISIBLE_CATALOG_COUNT),
  );
  const visibleCatalogEntries = BATTLE_TEAM_CATALOG.slice(
    visibleCatalogStart,
    visibleCatalogStart + VISIBLE_CATALOG_COUNT,
  );
  const battleReady = selectedEntries.every(Boolean);

  function assignPokemon(teamId: string, nextSlotIndex = slotIndex) {
    const entry = BATTLE_TEAM_ENTRY_BY_ID.get(teamId);
    if (!entry) return;

    setSelectedTeamIds((current) => {
      const next = [...current];
      const previousIndex = next.findIndex(
        (currentTeamId, index) => currentTeamId === entry.id && index !== nextSlotIndex,
      );

      if (previousIndex >= 0) {
        [next[previousIndex], next[nextSlotIndex]] = [next[nextSlotIndex], next[previousIndex]];
      } else {
        next[nextSlotIndex] = entry.id;
      }

      return next;
    });
  }

  function clearSelectedSlot() {
    setSelectedTeamIds((current) => {
      const next = [...current];
      next[slotIndex] = "";
      return next;
    });
  }

  function resetTeam() {
    setSelectedTeamIds(createDefaultSelection());
    setCatalogIndex(0);
    setSlotIndex(0);
  }

  function startBattle() {
    if (!battleReady) return;
    onStart(buildPackedTeam(selectedTeamIds));
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Enter",
          "Escape",
          "Backspace",
          "Delete",
          " ",
          "x",
          "X",
          "r",
          "R",
        ].includes(event.key)
      ) {
        event.preventDefault();
      }

      if (event.key === "Escape") {
        onBack();
        return;
      }

      if (event.key === "ArrowUp") {
        setCatalogIndex((current) =>
          current > 0 ? current - 1 : BATTLE_TEAM_CATALOG.length - 1,
        );
        return;
      }

      if (event.key === "ArrowDown") {
        setCatalogIndex((current) =>
          current < BATTLE_TEAM_CATALOG.length - 1 ? current + 1 : 0,
        );
        return;
      }

      if (event.key === "ArrowLeft") {
        setSlotIndex((current) => (current > 0 ? current - 1 : SLOT_COUNT - 1));
        return;
      }

      if (event.key === "ArrowRight") {
        setSlotIndex((current) => (current < SLOT_COUNT - 1 ? current + 1 : 0));
        return;
      }

      if (event.key === "Enter") {
        assignPokemon(highlightedEntry.id);
        return;
      }

      if (event.key === " " && battleReady) {
        startBattle();
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete" || event.key === "x" || event.key === "X") {
        clearSelectedSlot();
        return;
      }

      if (event.key === "r" || event.key === "R") {
        resetTeam();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [battleReady, highlightedEntry, onBack, slotIndex]);

  return (
    <PixelScreen>
      <div
        style={{
          position: "relative",
          width: 512,
          height: 384,
          overflow: "hidden",
          background: "#0d1620",
        }}
      >
        <img
          src={BACKGROUND_SRC}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.14,
            imageRendering: "pixelated",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(11,22,31,0.86) 0%, rgba(8,14,22,0.92) 100%)",
          }}
        />

        <div style={{ position: "absolute", left: 12, top: 10 }}>
          <PixelText size="sm" style={{ fontFamily: FONT_STACK }}>
            QUICK BATTLE SETUP
          </PixelText>
        </div>

        <div style={{ position: "absolute", left: 12, top: 34 }}>
          <PixelFrame width={222} height={274}>
            <PixelText
              size="xs"
              style={{
                marginBottom: 6,
                color: "#243040",
                textShadow: "1px 1px 0 #e8f0ff",
                fontFamily: FONT_STACK,
              }}
            >
              AVAILABLE POKEMON
            </PixelText>

            <div style={{ display: "grid", gap: 4 }}>
              {visibleCatalogEntries.map((candidate, offset) => {
                const index = visibleCatalogStart + offset;
                const selected = catalogIndex === index;
                const alreadyPicked = selectedTeamIds.includes(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => {
                      setCatalogIndex(index);
                      assignPokemon(candidate.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      minHeight: 18,
                      padding: "2px 6px",
                      border: selected ? "2px solid #0f3a66" : "1px solid #6f7f96",
                      background: selected ? "#b9dbff" : "#f4f7fb",
                      color: "#132033",
                      cursor: "pointer",
                      imageRendering: "pixelated",
                    }}
                  >
                    <img
                      src={candidate.iconSrc}
                      alt=""
                      aria-hidden="true"
                      style={{ width: 32, height: 14, imageRendering: "pixelated" }}
                    />
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div
                        style={{
                          fontFamily: FONT_STACK,
                          fontSize: 10,
                          fontWeight: "bold",
                          lineHeight: "12px",
                        }}
                      >
                        {candidate.name}
                      </div>
                      <div
                        style={{
                          fontFamily: FONT_STACK,
                          fontSize: 8,
                          lineHeight: "10px",
                          opacity: 0.8,
                        }}
                      >
                        {alreadyPicked ? "In team" : candidate.summary}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 6,
                fontFamily: FONT_STACK,
                fontSize: 9,
                lineHeight: "10px",
                color: "#243040",
              }}
            >
              {`${catalogIndex + 1}/${BATTLE_TEAM_CATALOG.length}  ${highlightedEntry.name}  ${highlightedEntry.summary}`}
            </div>
          </PixelFrame>
        </div>

        <div style={{ position: "absolute", left: 246, top: 34 }}>
          <PixelFrame width={254} height={274}>
            <PixelText
              size="xs"
              style={{
                marginBottom: 6,
                color: "#243040",
                textShadow: "1px 1px 0 #e8f0ff",
                fontFamily: FONT_STACK,
              }}
            >
              YOUR TEAM
            </PixelText>

            <div style={{ display: "grid", gap: 6 }}>
              {Array.from({ length: SLOT_COUNT }, (_, index) => {
                const selectedEntry = selectedEntries[index];
                const selected = slotIndex === index;
                return (
                  <button
                    key={`slot-${index + 1}`}
                    type="button"
                    onClick={() => setSlotIndex(index)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      minHeight: 34,
                      padding: "4px 6px",
                      border: selected ? "2px solid #7a3015" : "1px solid #6f7f96",
                      background: selected ? "#ffd4b8" : "#f4f7fb",
                      color: "#132033",
                      cursor: "pointer",
                      imageRendering: "pixelated",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        fontFamily: FONT_STACK,
                        fontSize: 10,
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      {index + 1}
                    </div>
                    {selectedEntry ? (
                      <>
                        <img
                          src={selectedEntry.iconSrc}
                          alt=""
                          aria-hidden="true"
                          style={{ width: 32, height: 14, imageRendering: "pixelated" }}
                        />
                        <div style={{ textAlign: "left" }}>
                          <div
                            style={{
                              fontFamily: FONT_STACK,
                              fontSize: 10,
                              fontWeight: "bold",
                              lineHeight: "12px",
                            }}
                          >
                            {selectedEntry.name}
                          </div>
                          <div
                            style={{
                              fontFamily: FONT_STACK,
                              fontSize: 8,
                              lineHeight: "10px",
                              opacity: 0.8,
                            }}
                          >
                            {selectedEntry.summary}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          fontFamily: FONT_STACK,
                          fontSize: 10,
                          lineHeight: "12px",
                          opacity: 0.74,
                        }}
                      >
                        Empty slot
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </PixelFrame>
        </div>

        <div style={{ position: "absolute", left: 12, top: 316 }}>
          <PixelFrame width={488} height={56}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                height: "100%",
              }}
            >
              <div
                style={{
                  flex: 1,
                  fontFamily: FONT_STACK,
                  fontSize: 10,
                  lineHeight: "13px",
                  color: "#132033",
                }}
              >
                {battleReady
                  ? "ENTER = place pokemon  |  SPACE = start battle  |  X = clear slot  |  R = reset"
                  : "Fill all 6 slots to start. Use UP/DOWN for catalog and LEFT/RIGHT for team slots."}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={resetTeam}
                  style={{
                    padding: "6px 10px",
                    border: "2px solid #6f7f96",
                    background: "#f4f7fb",
                    color: "#132033",
                    fontFamily: FONT_STACK,
                    fontSize: 10,
                    fontWeight: "bold",
                    cursor: "pointer",
                    imageRendering: "pixelated",
                  }}
                >
                  RESET
                </button>
                <button
                  type="button"
                  onClick={startBattle}
                  disabled={!battleReady}
                  style={{
                    padding: "6px 10px",
                    border: "2px solid #38651f",
                    background: battleReady ? "#9cf26f" : "#c7d4c7",
                    color: "#132033",
                    fontFamily: FONT_STACK,
                    fontSize: 10,
                    fontWeight: "bold",
                    cursor: battleReady ? "pointer" : "not-allowed",
                    imageRendering: "pixelated",
                    opacity: battleReady ? 1 : 0.68,
                  }}
                >
                  START
                </button>
              </div>
            </div>
          </PixelFrame>
        </div>
      </div>
    </PixelScreen>
  );
};
