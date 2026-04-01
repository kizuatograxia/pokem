import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { PixelText } from "../components/ui-pixel";
import { OverlayCanvas } from "./OverlayCanvas";
import { PokemonIcon } from "./PokemonIcon";
import type { HubPartyMember, HubStorageBox } from "./pcStorageData";

export type StorageMode = "organize" | "withdraw" | "deposit";

interface StorageOverlayProps {
  open: boolean;
  mode: StorageMode;
  onClose: () => void;
  party: Array<HubPartyMember | null>;
  setParty: Dispatch<SetStateAction<Array<HubPartyMember | null>>>;
  storageBoxes: HubStorageBox[];
  setStorageBoxes: Dispatch<SetStateAction<HubStorageBox[]>>;
}

interface HeldSelection {
  member: HubPartyMember;
  sourceArea: "party" | "box";
  sourceIndex: number;
  sourceBoxIndex: number | null;
}

const BOX_COLUMNS = 6;
const BOX_ROWS = 5;
const BOX_CELL_WIDTH = 48;
const BOX_CELL_HEIGHT = 44;
const BOX_ICON_LEFT = 176;
const BOX_ICON_TOP = 78;
const BOX_LEFT = 160;
const BOX_TOP = 18;
const BOX_WIDTH = 336;
const BOX_HEIGHT = 336;
const MODE_TAB_LEFT = 228;
const MODE_TAB_TOP = 252;
const MODE_TAB_WIDTH = 212;
const MODE_TAB_MIN_HEIGHT = 70;

const PARTY_PANEL_X = 182;
const PARTY_PANEL_OPEN_Y = 32;
const PARTY_PANEL_CLOSED_Y = 384;
const PARTY_PANEL_WIDTH = 172;
const PARTY_PANEL_HEIGHT = 352;

const PREVIEW_CENTER_X = 90;
const PREVIEW_CENTER_Y = 126;
const PREVIEW_SIZE = 96;
const ICON_SCALE = 0.58;

const PARTY_ICON_POSITIONS = [
  { x: 200, y: 34 },
  { x: 272, y: 50 },
  { x: 200, y: 98 },
  { x: 272, y: 114 },
  { x: 200, y: 162 },
  { x: 272, y: 178 },
] as const;

const TYPE_ICON_INDEX: Record<string, number> = {
  NORMAL: 0,
  FIGHTING: 1,
  FLYING: 2,
  POISON: 3,
  GROUND: 4,
  ROCK: 5,
  BUG: 6,
  GHOST: 7,
  STEEL: 8,
  FIRE: 10,
  WATER: 11,
  GRASS: 12,
  ELECTRIC: 13,
  PSYCHIC: 14,
  ICE: 15,
  DRAGON: 16,
  DARK: 17,
  FAIRY: 18,
};

const baseTextStyle = {
  color: "#585850",
  textShadow: "1px 1px 0 #a8b8b8",
};

const softTextStyle = {
  color: "#d0d0d0",
  textShadow: "1px 1px 0 #e0e0e0",
};

const buttonTextStyle = {
  color: "#f8f8f8",
  textShadow: "1px 1px 0 #505050",
};

function getFirstEmptyIndex(values: Array<HubPartyMember | null>): number {
  return values.findIndex((value) => value === null);
}

function getPartyCount(party: Array<HubPartyMember | null>): number {
  return party.filter((value): value is HubPartyMember => value !== null).length;
}

function getModeDescription(mode: StorageMode): string {
  switch (mode) {
    case "withdraw":
      return "Take Pokemon from Boxes.";
    case "deposit":
      return "Store Pokemon in Boxes.";
    default:
      return "Move Pokemon around.";
  }
}

function getModeLabel(mode: StorageMode): string {
  switch (mode) {
    case "withdraw":
      return "WITHDRAW POKEMON";
    case "deposit":
      return "DEPOSIT POKEMON";
    default:
      return "ORGANIZE BOXES";
  }
}

function getBoxCursorPosition(index: number): { x: number; y: number } {
  const row = Math.floor(index / BOX_COLUMNS);
  const column = index % BOX_COLUMNS;
  return {
    x: BOX_ICON_LEFT + column * BOX_CELL_WIDTH - 6,
    y: BOX_ICON_TOP + row * BOX_CELL_HEIGHT + 16,
  };
}

function getPartyCursorPosition(index: number): { x: number; y: number } {
  const slot = PARTY_ICON_POSITIONS[index];
  return {
    x: slot.x - 6,
    y: slot.y + 18,
  };
}

function getTypeIconLeft(index: number, count: number): number {
  return count === 1 ? 52 : 18 + 70 * index;
}

function TypeIcon({ type, left }: { type: string; left: number }) {
  const rowIndex = TYPE_ICON_INDEX[type];

  if (rowIndex === undefined) {
    return null;
  }

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left,
        top: 272,
        width: 64,
        height: 28,
        backgroundImage: "url(/assets/sprites/ui/common/types.png)",
        backgroundPosition: `0px -${rowIndex * 28}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
      }}
    />
  );
}

function PokemonPreviewSprite({ member }: { member: HubPartyMember }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();

    setLoaded(false);
    setFailed(false);

    image.onload = () => {
      if (!cancelled) {
        setLoaded(true);
      }
    };

    image.onerror = () => {
      if (!cancelled) {
        setFailed(true);
      }
    };

    image.src = member.frontSpriteSrc;

    if (image.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }

    return () => {
      cancelled = true;
    };
  }, [member.frontSpriteSrc]);

  if (!loaded || failed) {
    return (
      <PokemonIcon
        iconSrc={member.iconSrc}
        scale={1.5}
        style={{
          left: PREVIEW_CENTER_X - 48,
          top: PREVIEW_CENTER_Y - 48,
        }}
      />
    );
  }

  return (
    <img
      src={member.frontSpriteSrc}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        position: "absolute",
        left: PREVIEW_CENTER_X - PREVIEW_SIZE / 2,
        top: PREVIEW_CENTER_Y - PREVIEW_SIZE / 2,
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        objectFit: "contain",
        imageRendering: "pixelated",
      }}
    />
  );
}

export function StorageOverlay({
  open,
  mode,
  onClose,
  party,
  setParty,
  storageBoxes,
  setStorageBoxes,
}: StorageOverlayProps) {
  const [selectedArea, setSelectedArea] = useState<"party" | "box">("box");
  const [partyIndex, setPartyIndex] = useState(0);
  const [boxIndex, setBoxIndex] = useState(0);
  const [currentBoxIndex, setCurrentBoxIndex] = useState(0);
  const [heldSelection, setHeldSelection] = useState<HeldSelection | null>(null);
  const [statusText, setStatusText] = useState(getModeDescription(mode));

  useEffect(() => {
    if (!open) {
      return;
    }

    setHeldSelection(null);
    setStatusText(getModeDescription(mode));

    if (mode === "deposit") {
      setSelectedArea("party");
      setPartyIndex(0);
      return;
    }

    setSelectedArea("box");
    setBoxIndex(0);
    setPartyIndex(0);
  }, [mode, open]);

  const currentBox = storageBoxes[currentBoxIndex] ?? null;
  const selectedPokemon =
    selectedArea === "party"
      ? party[partyIndex] ?? null
      : currentBox?.contents[boxIndex] ?? null;
  const inspectedPokemon = heldSelection?.member ?? selectedPokemon;
  const partyVisible = mode === "deposit" || selectedArea === "party" || heldSelection !== null;
  const cursorPosition = selectedArea === "party" ? getPartyCursorPosition(partyIndex) : getBoxCursorPosition(boxIndex);
  const cursorSrc = heldSelection
    ? "/assets/sprites/ui/storage/cursor_fist.png"
    : "/assets/sprites/ui/storage/cursor_point_1.png";

  const partyCountLabel = useMemo(() => `Party: ${getPartyCount(party)}`, [party]);
  const boxRangeLabel = useMemo(() => {
    const occupiedSlots = currentBox?.contents.filter((member): member is HubPartyMember => member !== null) ?? [];
    if (occupiedSlots.length === 0) {
      return "Empty box";
    }

    const firstPokemon = occupiedSlots[0];
    const lastPokemon = occupiedSlots[occupiedSlots.length - 1];
    return `No.${String(firstPokemon.nationalDex).padStart(3, "0")}-${String(lastPokemon.nationalDex).padStart(3, "0")}`;
  }, [currentBox]);

  const currentBoxTheme = useMemo(
    () => `/assets/sprites/ui/storage/box_${currentBoxIndex % 40}.png`,
    [currentBoxIndex],
  );
  const modeLabel = getModeLabel(mode);
  const controlsText =
    mode === "organize"
      ? heldSelection
        ? "Z: Place\nX: Cancel\nQ/W: Box"
        : "Z: Pick up\nX: Back\nQ/W: Box"
      : mode === "withdraw"
        ? "Z: Withdraw\nX: Back\nQ/W: Box"
        : "Z: Store\nX: Back\nQ/W: Box";

  const switchBox = (delta: number) => {
    if (storageBoxes.length === 0) {
      return;
    }

    setCurrentBoxIndex((current) => (current + delta + storageBoxes.length) % storageBoxes.length);
    setStatusText(getModeDescription(mode));
  };

  const clearHeldSelection = () => {
    if (!heldSelection) {
      return false;
    }

    setHeldSelection(null);
    setSelectedArea(heldSelection.sourceArea);
    if (heldSelection.sourceArea === "party") {
      setPartyIndex(heldSelection.sourceIndex);
    } else {
      setBoxIndex(heldSelection.sourceIndex);
      if (heldSelection.sourceBoxIndex !== null) {
        setCurrentBoxIndex(heldSelection.sourceBoxIndex);
      }
    }
    setStatusText(`${heldSelection.member.name} was returned.`);
    return true;
  };

  const placeHeldPokemon = (destinationArea: "party" | "box", destinationIndex: number) => {
    if (!heldSelection) {
      return;
    }

    const sameSource =
      heldSelection.sourceArea === destinationArea &&
      heldSelection.sourceIndex === destinationIndex &&
      (destinationArea === "party" || heldSelection.sourceBoxIndex === currentBoxIndex);

    if (sameSource) {
      clearHeldSelection();
      return;
    }

    const nextParty = [...party];
    const nextBoxes = storageBoxes.map((box) => ({
      ...box,
      contents: [...box.contents],
    }));

    const destinationMember =
      destinationArea === "party"
        ? nextParty[destinationIndex] ?? null
        : nextBoxes[currentBoxIndex]?.contents[destinationIndex] ?? null;

    if (heldSelection.sourceArea === "party") {
      nextParty[heldSelection.sourceIndex] = destinationMember;
    } else if (heldSelection.sourceBoxIndex !== null) {
      nextBoxes[heldSelection.sourceBoxIndex].contents[heldSelection.sourceIndex] = destinationMember;
    }

    if (destinationArea === "party") {
      nextParty[destinationIndex] = heldSelection.member;
    } else {
      nextBoxes[currentBoxIndex].contents[destinationIndex] = heldSelection.member;
    }

    setParty(nextParty);
    setStorageBoxes(nextBoxes);
    setHeldSelection(null);
    setStatusText(
      destinationMember
        ? `${heldSelection.member.name} switched places with ${destinationMember.name}.`
        : `${heldSelection.member.name} was moved.`,
    );
  };

  const withdrawSelectedPokemon = () => {
    if (!currentBox) {
      return;
    }

    const member = currentBox.contents[boxIndex];
    if (!member) {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }

    const firstPartySlot = getFirstEmptyIndex(party);
    if (firstPartySlot < 0) {
      setStatusText("Your party is full!");
      return;
    }

    const nextParty = [...party];
    const nextBoxes = storageBoxes.map((box) => ({
      ...box,
      contents: [...box.contents],
    }));

    nextParty[firstPartySlot] = member;
    nextBoxes[currentBoxIndex].contents[boxIndex] = null;

    setParty(nextParty);
    setStorageBoxes(nextBoxes);
    setSelectedArea("box");
    setStatusText(`${member.name} was withdrawn.`);
  };

  const depositSelectedPokemon = () => {
    const member = party[partyIndex];
    if (!member || !currentBox) {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }

    if (getPartyCount(party) <= 1) {
      setStatusText("Can't deposit the last Pokemon!");
      return;
    }

    const firstBoxSlot = getFirstEmptyIndex(currentBox.contents);
    if (firstBoxSlot < 0) {
      setStatusText(`${currentBox.name} is full.`);
      return;
    }

    const nextParty = [...party];
    const nextBoxes = storageBoxes.map((box) => ({
      ...box,
      contents: [...box.contents],
    }));

    nextParty[partyIndex] = null;
    nextBoxes[currentBoxIndex].contents[firstBoxSlot] = member;

    const nextPartyIndex = nextParty.findIndex((partyMember) => partyMember !== null);

    setParty(nextParty);
    setStorageBoxes(nextBoxes);
    setSelectedArea("party");
    setPartyIndex(nextPartyIndex >= 0 ? nextPartyIndex : 0);
    setStatusText(`${member.name} was stored in ${currentBox.name}.`);
  };

  const handleConfirm = () => {
    if (mode === "withdraw") {
      withdrawSelectedPokemon();
      return;
    }

    if (mode === "deposit") {
      depositSelectedPokemon();
      return;
    }

    if (!selectedPokemon && !heldSelection) {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }

    if (heldSelection) {
      placeHeldPokemon(selectedArea, selectedArea === "party" ? partyIndex : boxIndex);
      return;
    }

    if (!selectedPokemon) {
      return;
    }

    setHeldSelection({
      member: selectedPokemon,
      sourceArea: selectedArea,
      sourceIndex: selectedArea === "party" ? partyIndex : boxIndex,
      sourceBoxIndex: selectedArea === "box" ? currentBoxIndex : null,
    });
    setStatusText(`${selectedPokemon.name} was selected.`);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" || event.code === "KeyX") {
        event.preventDefault();
        event.stopPropagation();

        if (clearHeldSelection()) {
          return;
        }

        if (mode === "organize" && selectedArea === "party") {
          setSelectedArea("box");
          setStatusText(getModeDescription(mode));
          return;
        }

        onClose();
        return;
      }

      if (event.code === "Enter" || event.code === "KeyZ") {
        event.preventDefault();
        event.stopPropagation();
        handleConfirm();
        return;
      }

      if (event.code === "KeyQ" || event.code === "PageUp") {
        event.preventDefault();
        event.stopPropagation();
        switchBox(-1);
        return;
      }

      if (event.code === "KeyW" || event.code === "PageDown") {
        event.preventDefault();
        event.stopPropagation();
        switchBox(1);
        return;
      }

      if (selectedArea === "party") {
        if (event.code === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          setPartyIndex((current) => (current % 2 === 1 ? current - 1 : current));
          return;
        }

        if (event.code === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();

          if (partyIndex % 2 === 0) {
            setPartyIndex((current) => Math.min(current + 1, PARTY_ICON_POSITIONS.length - 1));
            return;
          }

          if (mode === "organize") {
            setSelectedArea("box");
            setBoxIndex(Math.min(Math.floor(partyIndex / 2) * BOX_COLUMNS, BOX_COLUMNS * BOX_ROWS - 1));
          }
          return;
        }

        if (event.code === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          setPartyIndex((current) => (current - 2 + PARTY_ICON_POSITIONS.length) % PARTY_ICON_POSITIONS.length);
          return;
        }

        if (event.code === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          setPartyIndex((current) => (current + 2) % PARTY_ICON_POSITIONS.length);
        }
        return;
      }

      const row = Math.floor(boxIndex / BOX_COLUMNS);
      const column = boxIndex % BOX_COLUMNS;

      if (event.code === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();

        if (mode === "organize" && column === 0) {
          setSelectedArea("party");
          setPartyIndex(Math.min(row * 2, PARTY_ICON_POSITIONS.length - 1));
        } else {
          setBoxIndex(row * BOX_COLUMNS + (column === 0 ? BOX_COLUMNS - 1 : column - 1));
        }
        return;
      }

      if (event.code === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        setBoxIndex(row * BOX_COLUMNS + (column === BOX_COLUMNS - 1 ? 0 : column + 1));
        return;
      }

      if (event.code === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        if (row > 0) {
          setBoxIndex((row - 1) * BOX_COLUMNS + column);
        }
        return;
      }

      if (event.code === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        if (row < BOX_ROWS - 1) {
          setBoxIndex((row + 1) * BOX_COLUMNS + column);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    boxIndex,
    currentBox,
    currentBoxIndex,
    heldSelection,
    mode,
    onClose,
    open,
    party,
    partyIndex,
    selectedArea,
    selectedPokemon,
    storageBoxes,
  ]);

  if (!open) {
    return null;
  }

  return (
    <OverlayCanvas backgroundSrc="/assets/sprites/ui/storage/bg.png">
      <img
        src={currentBoxTheme}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          left: BOX_LEFT,
          top: BOX_TOP,
          width: BOX_WIDTH,
          height: BOX_HEIGHT,
          imageRendering: "pixelated",
        }}
      />
      <img
        src="/assets/sprites/ui/storage/overlay_main.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          imageRendering: "pixelated",
        }}
      />
      <img
        src="/assets/sprites/ui/storage/overlay_party.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          left: PARTY_PANEL_X,
          top: partyVisible ? PARTY_PANEL_OPEN_Y : PARTY_PANEL_CLOSED_Y,
          width: PARTY_PANEL_WIDTH,
          height: PARTY_PANEL_HEIGHT,
          imageRendering: "pixelated",
          transition: "top 120ms linear",
        }}
      />

      <PixelText
        size="xs"
        lineHeight={12}
        style={{
          position: "absolute",
          left: 188,
          top: 18,
          width: 168,
          textAlign: "center",
          ...buttonTextStyle,
        }}
      >
        {currentBox?.name ?? "Box 01"}
      </PixelText>

      <PixelText
        size="xs"
        lineHeight={12}
        style={{
          position: "absolute",
          right: 24,
          top: 18,
          width: 116,
          textAlign: "right",
          ...buttonTextStyle,
        }}
      >
        {boxRangeLabel}
      </PixelText>

      <PixelText
        size="xs"
        lineHeight={12}
        style={{
          position: "absolute",
          left: 220,
          top: 334,
          width: 100,
          textAlign: "center",
          ...buttonTextStyle,
        }}
      >
        {partyCountLabel}
      </PixelText>

      <PixelText
        size="xs"
        lineHeight={12}
        style={{
          position: "absolute",
          left: 416,
          top: 334,
          width: 62,
          textAlign: "center",
          ...buttonTextStyle,
        }}
      >
        Exit
      </PixelText>

      {partyVisible ? (
        <PixelText
          size="xs"
          lineHeight={12}
          style={{
            position: "absolute",
            left: 236,
            top: 280,
            width: 64,
            textAlign: "center",
            ...buttonTextStyle,
          }}
        >
          Back
        </PixelText>
      ) : null}

      {inspectedPokemon ? (
        <>
          <PokemonPreviewSprite member={inspectedPokemon} />

          <PixelText
            size="xs"
            lineHeight={12}
            style={{
              position: "absolute",
              left: 10,
              top: 14,
              width: 132,
              ...baseTextStyle,
            }}
          >
            {inspectedPokemon.name}
          </PixelText>

          {inspectedPokemon.gender ? (
            <PixelText
              size="xs"
              lineHeight={12}
              style={{
                position: "absolute",
                left: 146,
                top: 14,
                color: inspectedPokemon.gender === "F" ? "#f83820" : "#1870d8",
                textShadow:
                  inspectedPokemon.gender === "F" ? "1px 1px 0 #e09890" : "1px 1px 0 #88a8d0",
              }}
            >
              {inspectedPokemon.gender}
            </PixelText>
          ) : null}

          <img
            src="/assets/sprites/ui/storage/overlay_lv.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              position: "absolute",
              left: 6,
              top: 218,
              imageRendering: "pixelated",
            }}
          />

          <PixelText
            size="xs"
            lineHeight={12}
            style={{
              position: "absolute",
              left: 28,
              top: 212,
              ...baseTextStyle,
            }}
          >
            {String(inspectedPokemon.level)}
          </PixelText>

          {inspectedPokemon.shiny ? (
            <img
              src="/assets/sprites/ui-pke/shiny.png"
              alt=""
              aria-hidden="true"
              draggable={false}
              style={{
                position: "absolute",
                left: 156,
                top: 186,
                width: 16,
                height: 16,
                imageRendering: "pixelated",
              }}
            />
          ) : null}

          {inspectedPokemon.types.map((type, index) => (
            <TypeIcon
              key={`${inspectedPokemon.id}-${type}`}
              type={type}
              left={getTypeIconLeft(index, inspectedPokemon.types.length)}
            />
          ))}

          <PixelText
            size="xs"
            lineHeight={12}
            style={{
              position: "absolute",
              left: 0,
              top: 300,
              width: 172,
              textAlign: "center",
              ...(inspectedPokemon.abilityName ? baseTextStyle : softTextStyle),
            }}
          >
            {inspectedPokemon.abilityName ?? "No ability"}
          </PixelText>

          <PixelText
            size="xs"
            lineHeight={12}
            style={{
              position: "absolute",
              left: 0,
              top: 336,
              width: 172,
              textAlign: "center",
              ...(inspectedPokemon.itemName ? baseTextStyle : softTextStyle),
            }}
          >
            {inspectedPokemon.itemName ?? "No item"}
          </PixelText>
        </>
      ) : null}

      {partyVisible
        ? party.map((member, index) => {
            const slot = PARTY_ICON_POSITIONS[index];
            const held =
              heldSelection?.sourceArea === "party" &&
              heldSelection.sourceIndex === index;

            return member ? (
              <PokemonIcon
                key={`party-${index}`}
                iconSrc={member.iconSrc}
                scale={ICON_SCALE}
                style={{
                  left: slot.x,
                  top: slot.y,
                  opacity: held ? 0 : 1,
                }}
              />
            ) : null;
          })
        : null}

      {currentBox?.contents.map((member, index) => {
        if (!member) {
          return null;
        }

        const row = Math.floor(index / BOX_COLUMNS);
        const column = index % BOX_COLUMNS;
        const held =
          heldSelection?.sourceArea === "box" &&
          heldSelection.sourceBoxIndex === currentBoxIndex &&
          heldSelection.sourceIndex === index;

        return (
          <PokemonIcon
            key={`box-${index}`}
            iconSrc={member.iconSrc}
            scale={ICON_SCALE}
            style={{
              left: BOX_ICON_LEFT + column * BOX_CELL_WIDTH,
              top: BOX_ICON_TOP + row * BOX_CELL_HEIGHT,
              opacity: held ? 0 : 1,
            }}
          />
        );
      })}

      {heldSelection ? (
        <PokemonIcon
          iconSrc={heldSelection.member.iconSrc}
          scale={ICON_SCALE}
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y + 16,
          }}
        />
      ) : null}

      <img
        src={cursorSrc}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          left: cursorPosition.x,
          top: cursorPosition.y,
          width: 16,
          height: 16,
          imageRendering: "pixelated",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: MODE_TAB_LEFT,
          top: MODE_TAB_TOP,
          width: MODE_TAB_WIDTH,
          minHeight: MODE_TAB_MIN_HEIGHT,
          padding: "8px 12px",
          boxSizing: "border-box",
          background: "linear-gradient(180deg, #f8f8f8 0%, #ececec 100%)",
          border: "4px solid #404848",
          boxShadow:
            "inset 2px 2px 0 #ffffff, inset -2px -2px 0 #a0a0a0, 2px 2px 0 rgba(0, 0, 0, 0.2)",
        }}
      >
        <PixelText
          size="xs"
          lineHeight={12}
          style={{
            marginBottom: 4,
            color: "#202018",
            textShadow: "1px 1px 0 #d0d0d0",
          }}
        >
          {modeLabel}
        </PixelText>
        <PixelText
          size="xs"
          lineHeight={12}
          style={{
            marginBottom: 6,
            color: "#202018",
            textShadow: "1px 1px 0 #d0d0d0",
          }}
        >
          {statusText}
        </PixelText>
        <PixelText
          size="xs"
          lineHeight={12}
          style={{
            color: "#202018",
            textShadow: "1px 1px 0 #d0d0d0",
          }}
        >
          {controlsText}
        </PixelText>
      </div>
    </OverlayCanvas>
  );
}
