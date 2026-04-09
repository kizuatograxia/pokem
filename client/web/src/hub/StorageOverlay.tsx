import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { PixelMenuList, PixelText, PkeWindow } from "../components/ui-pixel";
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

interface PartyEntry {
  member: HubPartyMember;
  originalIndex: number;
}

interface MenuTarget {
  area: "party" | "box";
  index: number;
  boxIndex?: number;
}

type MenuState =
  | { kind: "actions"; selectedIndex: number; target: MenuTarget }
  | { kind: "boxCommands"; selectedIndex: number }
  | { kind: "jump"; selectedIndex: number }
  | { kind: "wallpaper"; selectedIndex: number }
  | { kind: "rename"; value: string }
  | { kind: "confirmRelease"; selectedIndex: number; target: MenuTarget };

const PARTY_SLOT_COUNT = 6;
const PARTY_BACK_INDEX = 6;
const BOX_COLUMNS = 6;
const BOX_ROWS = 5;
const BOX_SIZE = BOX_COLUMNS * BOX_ROWS;
const BOX_LEFT = 184;
const BOX_TOP = 18;
const BOX_WIDTH = 324;
const BOX_HEIGHT = 296;
const BOX_ICON_LEFT = 194;
const BOX_ICON_TOP = 48;
const PARTY_PANEL_X = 182;
const PARTY_PANEL_OPEN_Y = 32;
const PARTY_PANEL_CLOSED_Y = 384;
const PARTY_PANEL_WIDTH = 172;
const PARTY_PANEL_HEIGHT = 352;
const PREVIEW_CENTER_X = 90;
const PREVIEW_CENTER_Y = 134;
const PREVIEW_SIZE = 96;
const BOX_SLOT_SIZE = 48;
const PARTY_SLOT_WIDTH = 64;
const PARTY_SLOT_HEIGHT = 64;
const ICON_FRAME_SIZE = 64;
const BOX_ICON_SCALE = 1;
const PARTY_ICON_SCALE = 1;

const PARTY_ICON_POSITIONS = [
  { x: 200, y: 34 },
  { x: 272, y: 50 },
  { x: 200, y: 98 },
  { x: 272, y: 114 },
  { x: 200, y: 162 },
  { x: 272, y: 178 },
] as const;

const PARTY_CURSOR_POSITIONS = [
  { x: 200, y: 2 },
  { x: 272, y: 18 },
  { x: 200, y: 66 },
  { x: 272, y: 82 },
  { x: 200, y: 130 },
  { x: 272, y: 146 },
  { x: 236, y: 220 },
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

const baseTextStyle = { color: "#585850", textShadow: "1px 1px 0 #a8b8b8" };
const softTextStyle = { color: "#d0d0d0", textShadow: "1px 1px 0 #e0e0e0" };
const buttonTextStyle = { color: "#f8f8f8", textShadow: "1px 1px 0 #505050" };

function getFirstEmptyIndex(values: Array<HubPartyMember | null>): number {
  return values.findIndex((value) => value === null);
}

function getPartyCount(party: Array<HubPartyMember | null>): number {
  return party.filter((value): value is HubPartyMember => value !== null).length;
}

function normalizeParty(party: Array<HubPartyMember | null>): Array<HubPartyMember | null> {
  const compact = party.filter((member): member is HubPartyMember => member !== null);
  const normalized: Array<HubPartyMember | null> = [...compact];
  while (normalized.length < PARTY_SLOT_COUNT) normalized.push(null);
  return normalized.slice(0, PARTY_SLOT_COUNT);
}

function getModeDescription(mode: StorageMode): string {
  if (mode === "withdraw") return "Take Pokemon from Boxes.";
  if (mode === "deposit") return "Store Pokemon in Boxes.";
  return "Move Pokemon around.";
}

function getModeLabel(mode: StorageMode): string {
  if (mode === "withdraw") return "WITHDRAW POKEMON";
  if (mode === "deposit") return "DEPOSIT POKEMON";
  return "ORGANIZE BOXES";
}

function getTypeIconLeft(index: number, count: number): number {
  return count === 1 ? 52 : 18 + 70 * index;
}

function getMainCursorPosition(selection: number): { x: number; y: number } {
  if (selection === -1) return { x: 314, y: -24 };
  if (selection === -2) return { x: 238, y: 278 };
  if (selection === -3) return { x: 414, y: 278 };
  return {
    x: BOX_ICON_LEFT + (selection % BOX_COLUMNS) * 48,
    y: 16 + Math.floor(selection / BOX_COLUMNS) * 48,
  };
}

function getPartyCursorPosition(selection: number): { x: number; y: number } {
  return PARTY_CURSOR_POSITIONS[Math.max(0, Math.min(selection, PARTY_CURSOR_POSITIONS.length - 1))]!;
}

function getBoxIconPosition(index: number): { x: number; y: number } {
  return {
    x: BOX_ICON_LEFT + (index % BOX_COLUMNS) * 48,
    y: BOX_ICON_TOP + Math.floor(index / BOX_COLUMNS) * 48,
  };
}

function getMainSelectionFromKey(key: string, selection: number): number {
  switch (key) {
    case "ArrowUp":
      if (selection === -1) return -2;
      if (selection === -2) return 25;
      if (selection === -3) return 28;
      return selection - BOX_COLUMNS < 0 ? -1 : selection - BOX_COLUMNS;
    case "ArrowDown":
      if (selection === -1) return 2;
      if (selection === -2 || selection === -3) return -1;
      if (selection + BOX_COLUMNS >= BOX_SIZE) return selection < 27 ? -2 : -3;
      return selection + BOX_COLUMNS;
    case "ArrowLeft":
      if (selection === -1) return -4;
      if (selection === -2) return -3;
      if (selection === -3) return -2;
      return selection % BOX_COLUMNS === 0 ? selection + BOX_COLUMNS - 1 : selection - 1;
    case "ArrowRight":
      if (selection === -1) return -5;
      if (selection === -2) return -3;
      if (selection === -3) return -2;
      return selection % BOX_COLUMNS === BOX_COLUMNS - 1 ? selection - BOX_COLUMNS + 1 : selection + 1;
    default:
      return selection;
  }
}

function getPartySelectionFromKey(key: string, selection: number): number {
  switch (key) {
    case "ArrowLeft":
      return selection - 1 < 0 ? PARTY_BACK_INDEX : selection - 1;
    case "ArrowRight":
      return selection + 1 > PARTY_BACK_INDEX ? 0 : selection + 1;
    case "ArrowUp":
      return selection === PARTY_BACK_INDEX ? PARTY_SLOT_COUNT - 1 : selection - 2 < 0 ? PARTY_BACK_INDEX : selection - 2;
    case "ArrowDown":
      return selection === PARTY_BACK_INDEX ? 0 : selection + 2 > PARTY_BACK_INDEX ? PARTY_BACK_INDEX : selection + 2;
    default:
      return selection;
  }
}

function getVisibleMenuRange(selectedIndex: number, itemCount: number, maxVisible: number): { start: number; end: number } {
  if (itemCount <= maxVisible) return { start: 0, end: itemCount };
  const half = Math.floor(maxVisible / 2);
  const start = Math.max(0, Math.min(selectedIndex - half, itemCount - maxVisible));
  return { start, end: start + maxVisible };
}

function TypeIcon({ type, left }: { type: string; left: number }) {
  const rowIndex = TYPE_ICON_INDEX[type];
  if (rowIndex === undefined) return null;
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
    image.onload = () => !cancelled && setLoaded(true);
    image.onerror = () => !cancelled && setFailed(true);
    image.src = member.frontSpriteSrc;
    if (image.complete && image.naturalWidth > 0) setLoaded(true);
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
          filter: "drop-shadow(0 3px 0 rgba(64, 72, 80, 0.24))",
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
        filter: "drop-shadow(0 3px 0 rgba(64, 72, 80, 0.24))",
      }}
    />
  );
}

function StorageSlotIcon({
  iconSrc,
  scale,
  hidden = false,
}: {
  iconSrc: string;
  scale: number;
  hidden?: boolean;
}) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: ICON_FRAME_SIZE * scale,
        height: ICON_FRAME_SIZE * scale,
        opacity: hidden ? 0 : 1,
      }}
    >
      <PokemonIcon
        iconSrc={iconSrc}
        scale={scale}
        style={{ left: 0, top: 0 }}
      />
    </div>
  );
}

export function StorageOverlay(props: StorageOverlayProps) {
  const { open, mode, onClose, party, setParty, storageBoxes, setStorageBoxes } = props;
  const [mainSelection, setMainSelection] = useState(0);
  const [partySelection, setPartySelection] = useState(0);
  const [showPartyTab, setShowPartyTab] = useState(false);
  const [currentBoxIndex, setCurrentBoxIndex] = useState(0);
  const [heldSelection, setHeldSelection] = useState<HeldSelection | null>(null);
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [quickswap, setQuickswap] = useState(false);
  const [cursorFrame, setCursorFrame] = useState(0);

  const currentBox = storageBoxes[currentBoxIndex] ?? null;
  const partyEntries = useMemo<PartyEntry[]>(
    () => party.flatMap((member, index) => (member ? [{ member, originalIndex: index }] : [])),
    [party],
  );
  const partyCount = partyEntries.length;

  useEffect(() => {
    if (!open) return;
    setHeldSelection(null);
    setMenuState(null);
    setStatusText(getModeDescription(mode));
    setQuickswap(false);
    setMainSelection(mode === "deposit" ? -2 : 0);
    setPartySelection(0);
    setShowPartyTab(mode === "deposit");
  }, [mode, open]);

  useEffect(() => {
    if (!open) return;
    const intervalId = window.setInterval(() => setCursorFrame((current) => (current + 1) % 2), 500);
    return () => window.clearInterval(intervalId);
  }, [open]);

  const partyVisible = mode === "deposit" || showPartyTab || heldSelection !== null;
  const selectedPartyEntry = partySelection < partyEntries.length ? partyEntries[partySelection] ?? null : null;
  const selectedBoxMember = mainSelection >= 0 ? currentBox?.contents[mainSelection] ?? null : null;
  const inspectedPokemon =
    heldSelection?.member ??
    ((mode === "deposit" || showPartyTab) ? selectedPartyEntry?.member ?? null : selectedBoxMember);
  const currentBoxTheme = `/assets/sprites/ui/storage/box_${currentBox?.wallpaperIndex ?? (currentBoxIndex % 40)}.png`;
  const boxRangeLabel = useMemo(() => {
    const occupiedSlots = currentBox?.contents.filter((member): member is HubPartyMember => member !== null) ?? [];
    if (occupiedSlots.length === 0) return "Empty box";
    const firstPokemon = occupiedSlots[0];
    const lastPokemon = occupiedSlots[occupiedSlots.length - 1];
    return `No.${String(firstPokemon.nationalDex).padStart(3, "0")}-${String(lastPokemon.nationalDex).padStart(3, "0")}`;
  }, [currentBox]);

  const getPartyOriginalIndex = (selection: number): number | null => {
    if (selection < 0 || selection >= partyEntries.length) return null;
    return partyEntries[selection]?.originalIndex ?? null;
  };

  const getTargetMember = (target: MenuTarget): HubPartyMember | null => {
    if (target.area === "box") {
      return storageBoxes[target.boxIndex ?? currentBoxIndex]?.contents[target.index] ?? null;
    }
    return partyEntries[target.index]?.member ?? null;
  };

  const switchBox = (delta: number) => {
    if (storageBoxes.length === 0) return;
    setCurrentBoxIndex((current) => (current + delta + storageBoxes.length) % storageBoxes.length);
    setStatusText(null);
  };

  const closeMenu = () => setMenuState(null);

  const restoreHeldSelection = () => {
    if (!heldSelection) return false;
    if (heldSelection.sourceArea === "box" && heldSelection.sourceBoxIndex !== null) {
      const nextBoxes = storageBoxes.map((box) => ({ ...box, contents: [...box.contents] }));
      nextBoxes[heldSelection.sourceBoxIndex].contents[heldSelection.sourceIndex] = heldSelection.member;
      setStorageBoxes(nextBoxes);
      setCurrentBoxIndex(heldSelection.sourceBoxIndex);
      setMainSelection(heldSelection.sourceIndex);
    } else {
      const nextParty = [...party];
      nextParty[heldSelection.sourceIndex] = heldSelection.member;
      setParty(nextParty);
      setShowPartyTab(true);
      setPartySelection(Math.max(0, nextParty.slice(0, heldSelection.sourceIndex + 1).filter(Boolean).length - 1));
      setMainSelection(-2);
    }
    setHeldSelection(null);
    setStatusText(`${heldSelection.member.name} was returned.`);
    return true;
  };

  const withdrawPokemon = (target: MenuTarget) => {
    const member = getTargetMember(target);
    if (!member || target.area !== "box") {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }
    const firstPartySlot = getFirstEmptyIndex(party);
    if (firstPartySlot < 0) {
      setStatusText("Your party is full!");
      return;
    }
    const nextParty = [...party];
    const nextBoxes = storageBoxes.map((box) => ({ ...box, contents: [...box.contents] }));
    nextParty[firstPartySlot] = member;
    nextBoxes[target.boxIndex ?? currentBoxIndex].contents[target.index] = null;
    setParty(normalizeParty(nextParty));
    setStorageBoxes(nextBoxes);
    setStatusText(`${member.name} was withdrawn.`);
    closeMenu();
  };

  const depositPokemon = (target: MenuTarget) => {
    if (target.area !== "party" || !currentBox) {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }
    const originalIndex = getPartyOriginalIndex(target.index);
    const member = getTargetMember(target);
    if (originalIndex === null || !member) {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }
    if (partyCount <= 1) {
      setStatusText("Can't deposit the last Pokemon!");
      return;
    }
    const firstBoxSlot = getFirstEmptyIndex(currentBox.contents);
    if (firstBoxSlot < 0) {
      setStatusText(`${currentBox.name} is full.`);
      return;
    }
    const nextParty = [...party];
    const nextBoxes = storageBoxes.map((box) => ({ ...box, contents: [...box.contents] }));
    nextParty[originalIndex] = null;
    nextBoxes[currentBoxIndex].contents[firstBoxSlot] = member;
    const normalizedParty = normalizeParty(nextParty);
    setParty(normalizedParty);
    setStorageBoxes(nextBoxes);
    setStatusText(`${member.name} was stored in ${currentBox.name}.`);
    setPartySelection(Math.min(target.index, Math.max(getPartyCount(normalizedParty) - 1, 0)));
    closeMenu();
  };

  const holdPokemon = (target: MenuTarget) => {
    const member = getTargetMember(target);
    if (!member) {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }
    if (target.area === "party" && partyCount <= 1) {
      setStatusText("That's your last Pokemon!");
      return;
    }
    if (target.area === "box") {
      const nextBoxes = storageBoxes.map((box) => ({ ...box, contents: [...box.contents] }));
      nextBoxes[target.boxIndex ?? currentBoxIndex].contents[target.index] = null;
      setStorageBoxes(nextBoxes);
    } else {
      const originalIndex = getPartyOriginalIndex(target.index);
      if (originalIndex === null) {
        setStatusText("There isn't a Pokemon in that position.");
        return;
      }
      const nextParty = [...party];
      nextParty[originalIndex] = null;
      setParty(nextParty);
      setShowPartyTab(true);
    }
    setHeldSelection({
      member,
      sourceArea: target.area,
      sourceIndex: target.area === "box" ? target.index : (getPartyOriginalIndex(target.index) ?? 0),
      sourceBoxIndex: target.area === "box" ? target.boxIndex ?? currentBoxIndex : null,
    });
    setStatusText(`${member.name} is selected.`);
    closeMenu();
  };

  const placeHeldPokemon = (target: MenuTarget) => {
    if (!heldSelection) return;
    const targetPartyIndex = target.area === "party" ? getPartyOriginalIndex(target.index) : null;
    if (
      heldSelection.sourceArea === target.area &&
      heldSelection.sourceIndex === (target.area === "box" ? target.index : targetPartyIndex) &&
      (target.area === "party" || heldSelection.sourceBoxIndex === (target.boxIndex ?? currentBoxIndex))
    ) {
      restoreHeldSelection();
      return;
    }
    const nextParty = [...party];
    const nextBoxes = storageBoxes.map((box) => ({ ...box, contents: [...box.contents] }));
    const destinationMember = getTargetMember(target);
    if (target.area === "party" && targetPartyIndex === null) {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }
    if (heldSelection.sourceArea === "box" && heldSelection.sourceBoxIndex !== null) {
      nextBoxes[heldSelection.sourceBoxIndex].contents[heldSelection.sourceIndex] = destinationMember;
    } else {
      nextParty[heldSelection.sourceIndex] = destinationMember;
    }
    if (target.area === "box") {
      nextBoxes[target.boxIndex ?? currentBoxIndex].contents[target.index] = heldSelection.member;
    } else if (targetPartyIndex !== null) {
      nextParty[targetPartyIndex] = heldSelection.member;
    }
    const compactParty = heldSelection.sourceArea === "party" && target.area === "box" && destinationMember === null;
    setParty(compactParty ? normalizeParty(nextParty) : nextParty);
    setStorageBoxes(nextBoxes);
    setHeldSelection(null);
    setStatusText(destinationMember ? `${heldSelection.member.name} switched places with ${destinationMember.name}.` : `${heldSelection.member.name} was moved.`);
  };

  const releasePokemon = (target: MenuTarget) => {
    const member = getTargetMember(target);
    if (!member) {
      setStatusText("There isn't a Pokemon in that position.");
      closeMenu();
      return;
    }
    if (target.area === "box") {
      const nextBoxes = storageBoxes.map((box) => ({ ...box, contents: [...box.contents] }));
      nextBoxes[target.boxIndex ?? currentBoxIndex].contents[target.index] = null;
      setStorageBoxes(nextBoxes);
    } else {
      const originalIndex = getPartyOriginalIndex(target.index);
      if (originalIndex === null || partyCount <= 1) {
        setStatusText("That's your last Pokemon!");
        closeMenu();
        return;
      }
      const nextParty = [...party];
      nextParty[originalIndex] = null;
      const normalizedParty = normalizeParty(nextParty);
      setParty(normalizedParty);
      setPartySelection(Math.min(target.index, Math.max(getPartyCount(normalizedParty) - 1, 0)));
    }
    setStatusText(`${member.name} was released.`);
    closeMenu();
  };

  const openActionMenu = (target: MenuTarget) => {
    if (!getTargetMember(target)) {
      setStatusText("There isn't a Pokemon in that position.");
      return;
    }
    setMenuState({ kind: "actions", selectedIndex: 0, target });
  };

  const menuItems = useMemo(() => {
    if (!menuState) return [];
    if (menuState.kind === "boxCommands") return ["Jump", "Wallpaper", "Name", "Cancel"];
    if (menuState.kind === "jump") return storageBoxes.map((box) => `${box.name} (${box.contents.filter((member) => member !== null).length}/${box.contents.length})`);
    if (menuState.kind === "wallpaper") return Array.from({ length: 40 }, (_, index) => `Wallpaper ${String(index + 1).padStart(2, "0")}`);
    if (menuState.kind === "confirmRelease") return ["No", "Yes"];
    if (menuState.kind !== "actions") return [];
    if (mode === "withdraw") return ["Withdraw", "Summary", "Mark", "Release", "Cancel"];
    if (mode === "deposit") return ["Store", "Summary", "Mark", "Release", "Cancel"];
    return ["Move", "Summary", menuState.target.area === "party" ? "Store" : "Withdraw", "Item", "Mark", "Release", "Cancel"];
  }, [menuState, mode, storageBoxes]);

  const promptText = useMemo(() => {
    if (!menuState) return statusText;
    if (menuState.kind === "boxCommands") return "What do you want to do?";
    if (menuState.kind === "jump") return "Jump to which Box?";
    if (menuState.kind === "wallpaper") return "Pick the wallpaper.";
    if (menuState.kind === "rename") return "Box name?";
    if (menuState.kind === "confirmRelease") return "Release this Pokemon?";
    if (menuState.kind !== "actions") return statusText;
    const member = getTargetMember(menuState.target);
    return member ? `${member.name} is selected.` : statusText;
  }, [menuState, statusText, storageBoxes, currentBoxIndex, partyEntries]);

  const handleMenuConfirm = () => {
    if (!menuState) return;
    if (menuState.kind === "boxCommands") {
      if (menuState.selectedIndex === 0) {
        setMenuState({ kind: "jump", selectedIndex: currentBoxIndex });
        return;
      }
      if (menuState.selectedIndex === 1) {
        setMenuState({ kind: "wallpaper", selectedIndex: currentBox?.wallpaperIndex ?? currentBoxIndex % 40 });
        return;
      }
      if (menuState.selectedIndex === 2) {
        setMenuState({ kind: "rename", value: currentBox?.name ?? "" });
        return;
      }
      closeMenu();
      return;
    }
    if (menuState.kind === "jump") {
      setCurrentBoxIndex(menuState.selectedIndex);
      closeMenu();
      return;
    }
    if (menuState.kind === "wallpaper") {
      setStorageBoxes((current) => current.map((box, index) => index === currentBoxIndex ? { ...box, wallpaperIndex: menuState.selectedIndex } : box));
      closeMenu();
      return;
    }
    if (menuState.kind === "confirmRelease") {
      if (menuState.selectedIndex === 1) {
        releasePokemon(menuState.target);
        return;
      }
      closeMenu();
      return;
    }
    if (menuState.kind !== "actions") return;
    if (mode === "withdraw") {
      if (menuState.selectedIndex === 0) return void withdrawPokemon(menuState.target);
      if (menuState.selectedIndex === 3) return void setMenuState({ kind: "confirmRelease", selectedIndex: 0, target: menuState.target });
      if (menuState.selectedIndex !== 4) setStatusText("That option is not wired yet.");
      closeMenu();
      return;
    }
    if (mode === "deposit") {
      if (menuState.selectedIndex === 0) return void depositPokemon(menuState.target);
      if (menuState.selectedIndex === 3) return void setMenuState({ kind: "confirmRelease", selectedIndex: 0, target: menuState.target });
      if (menuState.selectedIndex !== 4) setStatusText("That option is not wired yet.");
      closeMenu();
      return;
    }
    if (menuState.selectedIndex === 0) return void holdPokemon(menuState.target);
    if (menuState.selectedIndex === 2) {
      if (menuState.target.area === "party") return void depositPokemon(menuState.target);
      return void withdrawPokemon(menuState.target);
    }
    if (menuState.selectedIndex === 5) return void setMenuState({ kind: "confirmRelease", selectedIndex: 0, target: menuState.target });
    if (menuState.selectedIndex !== 6) setStatusText("That option is not wired yet.");
    closeMenu();
  };

  const handleConfirm = () => {
    if (menuState) {
      handleMenuConfirm();
      return;
    }
    if (mode === "deposit" || showPartyTab) {
      if (partySelection === PARTY_BACK_INDEX) {
        if (mode === "deposit") onClose();
        else {
          setShowPartyTab(false);
          setMainSelection(-2);
          setStatusText(null);
        }
        return;
      }
      if (heldSelection) return void placeHeldPokemon({ area: "party", index: partySelection });
      if (mode === "organize" && quickswap) return void holdPokemon({ area: "party", index: partySelection });
      openActionMenu({ area: "party", index: partySelection });
      return;
    }
    if (mainSelection === -1) return void setMenuState({ kind: "boxCommands", selectedIndex: 0 });
    if (mainSelection === -2) {
      if (mode === "withdraw") {
        setStatusText("Which one will you take?");
        return;
      }
      setShowPartyTab(true);
      setPartySelection(0);
      setStatusText(null);
      return;
    }
    if (mainSelection === -3) return void onClose();
    const target: MenuTarget = { area: "box", index: mainSelection, boxIndex: currentBoxIndex };
    if (heldSelection) return void placeHeldPokemon(target);
    if (mode === "organize" && quickswap) return void holdPokemon(target);
    openActionMenu(target);
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (menuState?.kind === "rename") {
        if (event.key === "Escape" || event.key === "x" || event.key === "X") {
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
          return;
        }
        if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
          event.preventDefault();
          event.stopPropagation();
          const nextName = menuState.value.trim();
          if (nextName.length > 0) {
            setStorageBoxes((current) => current.map((box, index) => index === currentBoxIndex ? { ...box, name: nextName.slice(0, 12) } : box));
            setStatusText("The Box was renamed.");
          }
          closeMenu();
          return;
        }
        if (event.key === "Backspace") {
          event.preventDefault();
          event.stopPropagation();
          setMenuState({ ...menuState, value: menuState.value.slice(0, -1) });
          return;
        }
        if (event.key.length === 1 && /^[A-Za-z0-9 !?.'-]$/.test(event.key) && menuState.value.length < 12) {
          event.preventDefault();
          event.stopPropagation();
          setMenuState({ ...menuState, value: `${menuState.value}${event.key}` });
        }
        return;
      }
      if (menuState) {
        if (event.key === "Escape" || event.key === "x" || event.key === "X") {
          event.preventDefault();
          event.stopPropagation();
          closeMenu();
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          event.stopPropagation();
          setMenuState((current) => current && "selectedIndex" in current ? { ...current, selectedIndex: Math.max(0, current.selectedIndex - 1) } : current);
          return;
        }
        if (event.key === "ArrowDown") {
          event.preventDefault();
          event.stopPropagation();
          setMenuState((current) => current && "selectedIndex" in current ? { ...current, selectedIndex: Math.min(menuItems.length - 1, current.selectedIndex + 1) } : current);
          return;
        }
        if (event.key === "PageUp" && (menuState.kind === "jump" || menuState.kind === "wallpaper")) {
          event.preventDefault();
          event.stopPropagation();
          setMenuState((current) => current && "selectedIndex" in current ? { ...current, selectedIndex: Math.max(0, current.selectedIndex - 8) } : current);
          return;
        }
        if (event.key === "PageDown" && (menuState.kind === "jump" || menuState.kind === "wallpaper")) {
          event.preventDefault();
          event.stopPropagation();
          setMenuState((current) => current && "selectedIndex" in current ? { ...current, selectedIndex: Math.min(menuItems.length - 1, current.selectedIndex + 8) } : current);
          return;
        }
        if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
          event.preventDefault();
          event.stopPropagation();
          handleMenuConfirm();
        }
        return;
      }
      if (event.key === "Escape" || event.key === "x" || event.key === "X") {
        event.preventDefault();
        event.stopPropagation();
        if (restoreHeldSelection()) return;
        if (showPartyTab && mode !== "deposit") {
          setShowPartyTab(false);
          setMainSelection(-2);
          setStatusText(null);
          return;
        }
        onClose();
        return;
      }
      if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
        event.preventDefault();
        event.stopPropagation();
        handleConfirm();
        return;
      }
      if ((event.code === "KeyA" || event.code === "ShiftLeft" || event.code === "ShiftRight") && mode === "organize") {
        event.preventDefault();
        event.stopPropagation();
        setQuickswap((current) => !current);
        setStatusText(quickswap ? "Quick swap was turned off." : "Quick swap was turned on.");
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
      if (event.key === "Tab" && !showPartyTab && mode !== "deposit") {
        event.preventDefault();
        event.stopPropagation();
        setMainSelection(-1);
        return;
      }
      if (mode === "deposit" || showPartyTab) {
        if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        setPartySelection((current) => getPartySelectionFromKey(event.key, current));
        setStatusText(null);
        return;
      }
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      const nextSelection = getMainSelectionFromKey(event.key, mainSelection);
      if (nextSelection === -4) {
        switchBox(-1);
        setMainSelection(-1);
        return;
      }
      if (nextSelection === -5) {
        switchBox(1);
        setMainSelection(-1);
        return;
      }
      setMainSelection(nextSelection);
      setStatusText(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, menuState, menuItems.length, heldSelection, showPartyTab, mode, mainSelection, partySelection, quickswap, currentBoxIndex, party, storageBoxes]);

  if (!open) {
    return null;
  }

  const cursorPosition = mode === "deposit" || showPartyTab ? getPartyCursorPosition(partySelection) : getMainCursorPosition(mainSelection);
  const menuSelectionIndex = menuState && "selectedIndex" in menuState ? menuState.selectedIndex : 0;
  const cursorSrc = heldSelection
    ? (quickswap ? "/assets/sprites/ui/storage/cursor_fist_q.png" : "/assets/sprites/ui/storage/cursor_fist.png")
    : quickswap
      ? `/assets/sprites/ui/storage/cursor_point_${cursorFrame + 1}_q.png`
      : `/assets/sprites/ui/storage/cursor_point_${cursorFrame + 1}.png`;
  const menuWindowWidth = menuState?.kind === "jump" ? 252 : menuState?.kind === "wallpaper" ? 220 : 180;
  const visibleMenuRange = menuState ? getVisibleMenuRange(menuSelectionIndex, menuItems.length, menuState.kind === "jump" || menuState.kind === "wallpaper" ? 8 : 7) : { start: 0, end: 0 };
  const visibleMenuItems = menuItems.slice(visibleMenuRange.start, visibleMenuRange.end);

  return (
    <OverlayCanvas backgroundSrc="/assets/sprites/ui/storage/bg.png" style={{ background: "rgba(0, 0, 0, 0.4)" }}>
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
          filter: "drop-shadow(0 4px 0 rgba(48, 72, 88, 0.22))",
        }}
      />
      {currentBox?.contents.map((member, index) => {
        if (!member) return null;
        const position = getBoxIconPosition(index);
        const held = heldSelection?.sourceArea === "box" && heldSelection.sourceBoxIndex === currentBoxIndex && heldSelection.sourceIndex === index;
        return (
          <button key={`box-${index}`} type="button" onClick={() => { setShowPartyTab(false); setMainSelection(index); setStatusText(null); }} style={{ position: "absolute", left: position.x, top: position.y, width: BOX_SLOT_SIZE, height: BOX_SLOT_SIZE, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
            <StorageSlotIcon iconSrc={member.iconSrc} scale={BOX_ICON_SCALE} hidden={held} />
          </button>
        );
      })}
      <img
        src="/assets/sprites/ui/storage/overlay_main.png"
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
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
          transition: "top 400ms linear",
          filter: "drop-shadow(0 4px 0 rgba(28, 36, 44, 0.26))",
        }}
      />

      <button type="button" onClick={() => { setMainSelection(-1); setStatusText(null); }} style={{ position: "absolute", left: 188, top: 14, width: 168, height: 22, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
        <PixelText size="xs" lineHeight={12} style={{ width: "100%", textAlign: "center", ...buttonTextStyle }}>{currentBox?.name ?? "Box 01"}</PixelText>
      </button>
      <PixelText size="xs" lineHeight={12} style={{ position: "absolute", right: 24, top: 18, width: 116, textAlign: "right", ...buttonTextStyle }}>{boxRangeLabel}</PixelText>
      <button type="button" onClick={() => { setMainSelection(-2); setStatusText(null); }} style={{ position: "absolute", left: 220, top: 330, width: 104, height: 22, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
        <PixelText size="xs" lineHeight={12} style={{ width: "100%", textAlign: "center", ...buttonTextStyle }}>{`Party: ${partyCount}`}</PixelText>
      </button>
      <button type="button" onClick={() => { setMainSelection(-3); setStatusText(null); }} style={{ position: "absolute", left: 414, top: 330, width: 62, height: 22, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
        <PixelText size="xs" lineHeight={12} style={{ width: "100%", textAlign: "center", ...buttonTextStyle }}>Exit</PixelText>
      </button>

      {partyVisible ? (
        <button type="button" onClick={() => { setShowPartyTab(mode === "deposit"); setPartySelection(PARTY_BACK_INDEX); setStatusText(null); }} style={{ position: "absolute", left: 236, top: 276, width: 64, height: 22, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
          <PixelText size="xs" lineHeight={12} style={{ width: "100%", textAlign: "center", ...buttonTextStyle }}>Back</PixelText>
        </button>
      ) : null}

      {inspectedPokemon ? (
        <>
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: PREVIEW_CENTER_X - 42,
              top: PREVIEW_CENTER_Y + 30,
              width: 84,
              height: 16,
              borderRadius: "999px",
              background: "rgba(72, 84, 96, 0.18)",
              filter: "blur(3px)",
            }}
          />
          <PokemonPreviewSprite member={inspectedPokemon} />
          <PixelText size="xs" lineHeight={12} style={{ position: "absolute", left: 10, top: 14, width: 132, ...baseTextStyle }}>{inspectedPokemon.name}</PixelText>
          {inspectedPokemon.gender ? (
            <PixelText
              size="xs"
              lineHeight={12}
              style={{
                position: "absolute",
                left: 146,
                top: 14,
                color: inspectedPokemon.gender === "F" ? "#f83820" : "#1870d8",
                textShadow: inspectedPokemon.gender === "F" ? "1px 1px 0 #e09890" : "1px 1px 0 #88a8d0",
              }}
            >
              {inspectedPokemon.gender}
            </PixelText>
          ) : null}
          <img src="/assets/sprites/ui/storage/overlay_lv.png" alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", left: 6, top: 246, imageRendering: "pixelated" }} />
          <PixelText size="xs" lineHeight={12} style={{ position: "absolute", left: 28, top: 240, ...baseTextStyle }}>{String(inspectedPokemon.level)}</PixelText>
          {inspectedPokemon.shiny ? (
            <img src="/assets/sprites/ui-pke/shiny.png" alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", left: 156, top: 198, width: 16, height: 16, imageRendering: "pixelated" }} />
          ) : null}
          {inspectedPokemon.types.map((type, index) => <TypeIcon key={`${inspectedPokemon.id}-${type}`} type={type} left={getTypeIconLeft(index, inspectedPokemon.types.length)} />)}
          <PixelText size="xs" lineHeight={12} style={{ position: "absolute", left: 0, top: 312, width: 172, textAlign: "center", ...(inspectedPokemon.abilityName ? baseTextStyle : softTextStyle) }}>{inspectedPokemon.abilityName ?? "No ability"}</PixelText>
          <PixelText size="xs" lineHeight={12} style={{ position: "absolute", left: 0, top: 348, width: 172, textAlign: "center", ...(inspectedPokemon.itemName ? baseTextStyle : softTextStyle) }}>{inspectedPokemon.itemName ?? "No item"}</PixelText>
        </>
      ) : null}

      {partyVisible ? partyEntries.map((entry, index) => {
        const slot = PARTY_ICON_POSITIONS[index];
        const held = heldSelection?.sourceArea === "party" && heldSelection.sourceIndex === entry.originalIndex;
        return (
          <button key={`party-${entry.originalIndex}`} type="button" onClick={() => { setShowPartyTab(true); setPartySelection(index); setStatusText(null); }} style={{ position: "absolute", left: slot.x, top: slot.y, width: PARTY_SLOT_WIDTH, height: PARTY_SLOT_HEIGHT, border: "none", background: "transparent", padding: 0, cursor: "pointer" }}>
            <StorageSlotIcon iconSrc={entry.member.iconSrc} scale={PARTY_ICON_SCALE} hidden={held} />
          </button>
        );
      }) : null}

      {heldSelection ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: cursorPosition.x,
            top: cursorPosition.y + 16,
            width: ICON_FRAME_SIZE,
            height: ICON_FRAME_SIZE,
          }}
        >
          <StorageSlotIcon iconSrc={heldSelection.member.iconSrc} scale={mode === "deposit" || showPartyTab ? PARTY_ICON_SCALE : BOX_ICON_SCALE} />
        </div>
      ) : null}
      <img src={cursorSrc} alt="" aria-hidden="true" draggable={false} style={{ position: "absolute", left: cursorPosition.x, top: cursorPosition.y, width: 16, height: 16, imageRendering: "pixelated" }} />

      {promptText ? (
        <PkeWindow
          width={332}
          height={48}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            filter: "drop-shadow(0 4px 0 rgba(32, 40, 48, 0.24))",
          }}
        >
          <PixelText size="xs" lineHeight={12} style={{ color: "#202018", textShadow: "1px 1px 0 #d0d0d0" }}>{promptText}</PixelText>
        </PkeWindow>
      ) : null}

      {menuState && menuState.kind !== "rename" && visibleMenuItems.length > 0 ? (
        <PkeWindow width={menuWindowWidth} height={18 + visibleMenuItems.length * 16} style={{ position: "absolute", right: 0, bottom: 52 }}>
          {visibleMenuRange.start > 0 ? <PixelText size="xs" lineHeight={12} style={{ position: "absolute", right: 8, top: -6, color: "#202018", textShadow: "1px 1px 0 #d0d0d0" }}>^</PixelText> : null}
          {visibleMenuRange.end < menuItems.length ? <PixelText size="xs" lineHeight={12} style={{ position: "absolute", right: 8, bottom: -6, color: "#202018", textShadow: "1px 1px 0 #d0d0d0" }}>v</PixelText> : null}
          <PixelMenuList items={visibleMenuItems} selectedIndex={menuSelectionIndex - visibleMenuRange.start} onItemClick={(index) => setMenuState(menuState && "selectedIndex" in menuState ? { ...menuState, selectedIndex: visibleMenuRange.start + index } : menuState)} />
        </PkeWindow>
      ) : null}

      {menuState?.kind === "rename" ? (
        <PkeWindow width={220} height={68} style={{ position: "absolute", right: 0, bottom: 52 }}>
          <PixelText size="xs" lineHeight={12} style={{ marginBottom: 8, color: "#202018", textShadow: "1px 1px 0 #d0d0d0" }}>{getModeLabel(mode)}</PixelText>
          <PixelText size="xs" lineHeight={12} style={{ padding: "4px 6px", color: "#202018", textShadow: "1px 1px 0 #d0d0d0", border: "2px solid #404848", minHeight: 20 }}>
            {`${menuState.value}${cursorFrame === 0 ? "_" : " "}`}
          </PixelText>
        </PkeWindow>
      ) : null}
    </OverlayCanvas>
  );
}
