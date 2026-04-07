import React, { useEffect, useMemo, useState } from "react";
import type {
  BattleBagPocketView,
  BattleSideView,
  ItemCommand,
  MoveCommand,
  MultiChoiceCommand,
  ShiftCommand,
  SlotChoice,
  SwitchCommand,
} from "./types.js";
import { PixelScreen } from "../components/ui-pixel/PixelScreen.js";
import { BattleField } from "./BattleField.js";
import { BattleHud } from "./BattleHud.js";
import { BattleLoadingScreen } from "./BattleLoadingScreen.js";
import { BattleResultScreen } from "./BattleResultScreen.js";
import {
  type BattleCommandAction,
  BattleCommandMenu,
  BattleTargetMenu,
  type BattleTargetOption,
  BattleMoveMenu,
  BattleMessageBox,
} from "./BattleMenu.js";
import { BattleBagScreen } from "./BattleBag.js";
import {
  BATTLE_BAG_POCKETS,
  firstBattleBagPocketIndex,
  getBattleBagItemMeta,
  type BattleBagPocket,
} from "./battleBagData.js";
import { BattlePartyScreen } from "./BattleParty.js";
import { useBattleWs } from "./useBattleWs.js";

type MenuState = "command" | "fight" | "party" | "bag" | "target" | null;
type PartyMode = "switch" | "bag";

interface Props {
  onExit: () => void;
}

const HUD_FONT = '"Courier New", monospace';
const CHOOSABLE_TARGETS = new Set([
  "normal",
  "any",
  "adjacentAlly",
  "adjacentAllyOrSelf",
  "adjacentFoe",
]);

function nominalSideSize(gametype: "singles" | "doubles" | "triples" | undefined): number {
  if (gametype === "triples") return 3;
  if (gametype === "doubles") return 2;
  return 1;
}

function movePartySelection(
  current: number,
  direction: "left" | "right" | "up" | "down",
  canCancel: boolean,
): number {
  if (current === 6) {
    if (direction === "up") return 5;
    return 6;
  }

  switch (direction) {
    case "left":
      return current % 2 === 1 ? current - 1 : current;
    case "right":
      return current % 2 === 0 && current + 1 < 6 ? current + 1 : current;
    case "up":
      return current >= 2 ? current - 2 : current;
    case "down":
      if (current + 2 < 6) return current + 2;
      return canCancel ? 6 : current;
  }

  return current;
}

function moveVerticalListSelection(
  current: number,
  direction: "up" | "down",
  maxIndex: number,
): number {
  if (direction === "up") return Math.max(0, current - 1);
  return Math.min(maxIndex, current + 1);
}

function wrapIndex(current: number, delta: number, size: number): number {
  if (size <= 0) return 0;
  return (current + delta + size) % size;
}

function validTargetLoc(
  sourceLoc: number,
  targetLoc: number,
  activePerHalf: number,
  targetType: string,
): boolean {
  if (targetLoc === 0) return true;
  if (Math.abs(targetLoc) > activePerHalf) return false;

  const isSelf = sourceLoc === targetLoc;
  const isFoe = targetLoc > 0;
  const acrossFromTargetLoc = -(activePerHalf + 1 - targetLoc);
  const isAdjacent =
    targetLoc > 0
      ? Math.abs(acrossFromTargetLoc - sourceLoc) <= 1
      : Math.abs(targetLoc - sourceLoc) === 1;

  switch (targetType) {
    case "normal":
      return isAdjacent;
    case "adjacentAlly":
      return isAdjacent && !isFoe;
    case "adjacentAllyOrSelf":
      return (isAdjacent && !isFoe) || isSelf;
    case "adjacentFoe":
      return isAdjacent && isFoe;
    case "any":
      return !isSelf;
    default:
      return false;
  }
}

function buildTargetOptions(
  ourSide: BattleSideView | null,
  foeSide: BattleSideView | null,
  activePerHalf: number,
  activeSlot: number,
  targetType: string | undefined,
): BattleTargetOption[] {
  if (!targetType || !CHOOSABLE_TARGETS.has(targetType)) return [];

  const sourceLoc = -(activeSlot + 1);
  const options: BattleTargetOption[] = [];

  for (let slotIndex = 0; slotIndex < activePerHalf; slotIndex += 1) {
    const ally = ourSide?.active[slotIndex];
    const targetLoc = -(slotIndex + 1);
    if (
      ally &&
      ally.hpStatus !== "fainted" &&
      validTargetLoc(sourceLoc, targetLoc, activePerHalf, targetType)
    ) {
      options.push({
        screenIndex: slotIndex * 2,
        targetLoc,
        label: ally.name,
        side: "ally",
        slotIndex,
      });
    }
  }

  for (let slotIndex = 0; slotIndex < activePerHalf; slotIndex += 1) {
    const foe = foeSide?.active[slotIndex];
    const targetLoc = slotIndex + 1;
    if (
      foe &&
      foe.hpStatus !== "fainted" &&
      validTargetLoc(sourceLoc, targetLoc, activePerHalf, targetType)
    ) {
      options.push({
        screenIndex: (activePerHalf - 1 - slotIndex) * 2 + 1,
        targetLoc,
        label: foe.name,
        side: "foe",
        slotIndex,
      });
    }
  }

  return options.sort((left, right) => left.screenIndex - right.screenIndex);
}

function initialTargetScreenIndex(
  options: BattleTargetOption[],
  activeSlot: number,
  activePerHalf: number,
  targetType: string | undefined,
): number {
  if (options.length === 0) return 0;

  let preferredTargetLoc: number | null = null;
  switch (targetType) {
    case "adjacentAlly":
      preferredTargetLoc =
        options.find((option) => option.side === "ally" && option.slotIndex !== activeSlot)
          ?.targetLoc ?? null;
      break;
    case "adjacentAllyOrSelf":
      preferredTargetLoc = -(activeSlot + 1);
      break;
    case "normal":
    case "adjacentFoe":
    case "any":
      preferredTargetLoc = activePerHalf - activeSlot;
      break;
    default:
      break;
  }

  return (
    options.find((option) => option.targetLoc === preferredTargetLoc)?.screenIndex ??
    options[0].screenIndex
  );
}

function moveTargetSelection(
  current: number,
  direction: "left" | "right" | "up" | "down",
  options: BattleTargetOption[],
  sideSizes: [number, number],
): number {
  const currentOption = options.find((option) => option.screenIndex === current);
  if (!currentOption) return options[0]?.screenIndex ?? current;

  if (direction === "left" || direction === "right") {
    let increment = current % 2 === 0 ? -2 : 2;
    if (direction === "right") increment *= -1;
    const rowLength = sideSizes[current % 2] * 2;
    let next = current;

    while (true) {
      next += increment;
      if (next < 0 || next >= rowLength) break;
      if (options.some((option) => option.screenIndex === next)) {
        return next;
      }
    }
    return current;
  }

  if ((direction === "up" && current % 2 !== 0) || (direction === "down" && current % 2 === 0)) {
    return current;
  }

  const targetSide = direction === "up" ? "foe" : "ally";
  const mirroredSlot =
    sideSizes[targetSide === "ally" ? 0 : 1] - 1 - currentOption.slotIndex;

  return (
    options.find(
      (option) => option.side === targetSide && option.slotIndex === mirroredSlot,
    )?.screenIndex ??
    options.find((option) => option.side === targetSide)?.screenIndex ??
    current
  );
}

function upsertChoice(choices: SlotChoice[], nextChoice: SlotChoice): SlotChoice[] {
  const filtered = choices.filter((choice) => choice.activeSlot !== nextChoice.activeSlot);
  return [...filtered, nextChoice].sort((left, right) => left.activeSlot - right.activeSlot);
}

function activePartyPositions(side: BattleSideView | null): Set<number> {
  const positions = new Set<number>();
  if (!side) return positions;

  const used = new Set<number>();
  for (const active of side.active) {
    const index = side.party.findIndex(
      (slot, partyIndex) =>
        !used.has(partyIndex) &&
        slot.speciesId === active.speciesId &&
        slot.name === active.name,
    );
    if (index >= 0) {
      used.add(index);
      positions.add(index);
    }
  }

  return positions;
}

function activePartyIndexForSlot(
  side: BattleSideView | null,
  activeSlot: number,
): number | null {
  if (!side) return null;
  const active = side.active[activeSlot];
  if (!active) return null;
  const index = side.party.findIndex(
    (slot) => slot.speciesId === active.speciesId && slot.name === active.name,
  );
  return index >= 0 ? index : null;
}

function hydrateBattleBag(
  bag: BattleBagPocketView[] | undefined,
): BattleBagPocket[] {
  if (!bag?.length) {
    return BATTLE_BAG_POCKETS;
  }

  return bag.map((pocket) => ({
    id: pocket.id,
    name: pocket.name,
    items: pocket.items.map((item) => {
      const meta = getBattleBagItemMeta(item.id);
      return {
        ...item,
        useType: meta?.useType ?? "field",
        failureText: meta?.failureText ?? "This isn't the time to use that.",
      };
    }),
  }));
}

export const BattleScreen: React.FC<Props> = ({ onExit }) => {
  const [started, setStarted] = useState(false);
  const [menuState, setMenuState] = useState<MenuState>(null);
  const [partyMode, setPartyMode] = useState<PartyMode>("switch");
  const [selectedActiveSlot, setSelectedActiveSlot] = useState(0);
  const [queuedChoices, setQueuedChoices] = useState<SlotChoice[]>([]);
  const [commandIndex, setCommandIndex] = useState(0);
  const [moveIndex, setMoveIndex] = useState(0);
  const [partyIndex, setPartyIndex] = useState(0);
  const [bagPocketIndex, setBagPocketIndex] = useState(firstBattleBagPocketIndex());
  const [bagItemIndex, setBagItemIndex] = useState(0);
  const [targetIndex, setTargetIndex] = useState(0);
  const [pendingMoveIndex, setPendingMoveIndex] = useState<number | null>(null);
  const [megaEnabledSlots, setMegaEnabledSlots] = useState<Record<number, boolean>>({});
  const [teraEnabledSlots, setTeraEnabledSlots] = useState<Record<number, boolean>>({});
  const [dynamaxEnabledSlots, setDynamaxEnabledSlots] = useState<Record<number, boolean>>({});
  const [partyHelpText, setPartyHelpText] = useState("Choose a Pokemon.");
  const [pendingBagItemId, setPendingBagItemId] = useState<string | null>(null);
  const [displayMessage, setDisplayMessage] = useState<string | null>(null);

  const { status, state, playerSlot, battleId, error, sendCommand } =
    useBattleWs({ cpu: true, enabled: started });

  const ourSide = state && playerSlot !== null ? state.sides[playerSlot] : null;
  const foeSide =
    state && playerSlot !== null ? state.sides[playerSlot === 0 ? 1 : 0] : null;
  const request = state?.pendingRequest;
  const slotRequests = request?.slots ?? [];
  const selectedSlotRequest =
    slotRequests.find((slotRequest) => slotRequest.slot === selectedActiveSlot) ??
    slotRequests[0] ??
    null;
  const sideSize = Math.max(
    nominalSideSize(state?.gametype),
    ourSide?.active.length ?? 0,
    foeSide?.active.length ?? 0,
  );
  const sideSizes: [number, number] = [sideSize, sideSize];
  const currentPokemon = ourSide?.active[selectedActiveSlot] ?? null;
  const currentMoves = selectedSlotRequest?.moves ?? [];
  const bagPockets = useMemo(() => hydrateBattleBag(state?.bag), [state?.bag]);
  const switchablePositions = new Set<number>(
    (request?.switches ?? []).map((pokemon) => pokemon.position - 1),
  );
  const claimedSwitchPositions = new Set<number>(
    queuedChoices
      .filter((choice) => choice.choice.kind === "switch")
      .map((choice) => (choice.choice as SwitchCommand).partyIndex - 1),
  );
  const availableSwitchPositions = new Set<number>(
    Array.from(switchablePositions).filter((position) => !claimedSwitchPositions.has(position)),
  );
  const availableSwitchList = Array.from(availableSwitchPositions).sort(
    (left, right) => left - right,
  );
  const availableSwitchKey = availableSwitchList.join(",");
  const activePositions = activePartyPositions(ourSide);
  const currentActivePartyIndex = activePartyIndexForSlot(ourSide, selectedActiveSlot);
  const canCancelParty = request?.kind === "move";
  const showPartyCancel = partyMode === "bag" ? true : canCancelParty;
  const canStepBack = !request?.noCancel && queuedChoices.length > 0;
  const canMegaEvo = currentMoves.some((move) => move.canMegaEvo);
  const canTerastallize = currentMoves.some((move) => move.canTerastallize);
  const canDynamax = currentMoves.some((move) => move.canDynamax);
  const canShift =
    ourSide !== null &&
    foeSide !== null &&
    !selectedSlotRequest?.forceSwitch &&
    ((ourSide.active.length > 2 || foeSide.active.length > 2) &&
      (ourSide.active.length === 2 || selectedActiveSlot !== 1));
  const pendingMove =
    pendingMoveIndex !== null ? currentMoves[pendingMoveIndex] ?? null : null;
  const targetOptions =
    pendingMoveIndex !== null
      ? buildTargetOptions(ourSide, foeSide, sideSize, selectedActiveSlot, pendingMove?.target)
      : [];
  const bagPocket = bagPockets[bagPocketIndex] ?? bagPockets[0];
  const bagMaxIndex = bagPocket.items.length;
  const requestKey = `${battleId ?? "none"}:${state?.turn ?? 0}:${request?.kind ?? "none"}:${slotRequests
    .map((slotRequest) => `${slotRequest.slot}:${slotRequest.forceSwitch ? 1 : 0}`)
    .join("|")}:${(request?.switches ?? []).map((pokemon) => pokemon.position).join(",")}:${request?.noCancel ? 1 : 0}`;
  const battleEnded = status === "ended" || state?.phase === "ended";
  const resultScreenMode =
    battleEnded && (state?.result === "win" || state?.result === "loss")
      ? state.result
      : null;
  const showLoadingOverlay =
    !battleEnded &&
    (!started ||
      (!ourSide?.active.some(Boolean) && menuState !== "party" && menuState !== "bag") ||
      !foeSide?.active.some(Boolean) ||
      status === "connecting" ||
      status === "waiting" ||
      status === "error");
  const showBattleScene =
    !!state &&
    (battleEnded ||
      !!ourSide?.active.some(Boolean) ||
      !!foeSide?.active.some(Boolean) ||
      menuState === "party" ||
      menuState === "bag");

  const selection = useMemo(() => {
    const nextSelection: {
      player: Partial<Record<number, 1 | 2>>;
      foe: Partial<Record<number, 1 | 2>>;
    } = {
      player: {},
      foe: {},
    };

    if (
      menuState === "command" ||
      menuState === "fight" ||
      menuState === "party" ||
      menuState === "bag"
    ) {
      nextSelection.player[selectedActiveSlot] = 1;
    }

    if (menuState === "target") {
      nextSelection.player[selectedActiveSlot] = 1;
      const selectedOption = targetOptions.find((option) => option.screenIndex === targetIndex);
      if (selectedOption) {
        if (selectedOption.side === "ally") {
          nextSelection.player[selectedOption.slotIndex] = 2;
        } else {
          nextSelection.foe[selectedOption.slotIndex] = 2;
        }
      }
    }

    return nextSelection;
  }, [menuState, selectedActiveSlot, targetIndex, targetOptions]);

  const fourthAction: "RUN" | "CALL" | "CANCEL" =
    queuedChoices.length === 0 && !request?.noCancel ? "RUN" : "CANCEL";

  function resetCurrentChoiceUi() {
    setCommandIndex(0);
    setMoveIndex(0);
    setBagItemIndex(0);
    setPartyMode("switch");
    setPendingBagItemId(null);
    setPendingMoveIndex(null);
    setTargetIndex(0);
    setPartyHelpText("Choose a Pokemon.");
  }

  function setBagPocket(nextPocketIndex: number) {
    const normalized = wrapIndex(nextPocketIndex, 0, bagPockets.length);
    setBagPocketIndex(normalized);
    setBagItemIndex((current) =>
      Math.min(current, (bagPockets[normalized]?.items.length ?? 0)),
    );
  }

  function cycleBagPocket(direction: -1 | 1) {
    setBagPocket(wrapIndex(bagPocketIndex, direction, bagPockets.length));
  }

  function clearSpecialModes(slot: number) {
    setMegaEnabledSlots((current) => ({ ...current, [slot]: false }));
    setTeraEnabledSlots((current) => ({ ...current, [slot]: false }));
    setDynamaxEnabledSlots((current) => ({ ...current, [slot]: false }));
  }

  function moveToNextSlot(nextChoices: SlotChoice[]) {
    const nextSlotRequest = slotRequests.find(
      (slotRequest) =>
        !nextChoices.some((choice) => choice.activeSlot === slotRequest.slot),
    );

    if (!nextSlotRequest) {
      return false;
    }

    setQueuedChoices(nextChoices);
    setSelectedActiveSlot(nextSlotRequest.slot);
    resetCurrentChoiceUi();
    setPartyMode("switch");
    setMenuState(
      request?.kind === "switch" || nextSlotRequest.forceSwitch ? "party" : "command",
    );
    return true;
  }

  function submitTurnChoice(choice: MoveCommand | SwitchCommand | ShiftCommand | ItemCommand) {
    if (!state || playerSlot === null || !battleId) return;

    const nextChoices = upsertChoice(queuedChoices, {
      activeSlot: choice.activeSlot,
      choice,
    });

    clearSpecialModes(choice.activeSlot);
    setPendingMoveIndex(null);
    setTargetIndex(0);

    if (slotRequests.length <= 1) {
      sendCommand(choice);
      setQueuedChoices([]);
      setMenuState(null);
      return;
    }

    if (moveToNextSlot(nextChoices)) {
      return;
    }

    const multiChoice: MultiChoiceCommand = {
      kind: "multi-choice",
      battleId,
      playerSlot,
      turn: state.turn,
      stateHash: "",
      choices: nextChoices,
    };
    sendCommand(multiChoice);
    setQueuedChoices([]);
    setMenuState(null);
  }

  function stepBackChoice() {
    if (queuedChoices.length === 0) return;

    const previousChoice = queuedChoices[queuedChoices.length - 1];
    const remainingChoices = queuedChoices.slice(0, -1);
    setQueuedChoices(remainingChoices);
    setSelectedActiveSlot(previousChoice.activeSlot);
    resetCurrentChoiceUi();
    setMenuState(
      request?.kind === "switch" ||
        slotRequests.find((slotRequest) => slotRequest.slot === previousChoice.activeSlot)
          ?.forceSwitch
        ? "party"
        : "command",
    );
  }

  function submitMove(index: number, target?: number) {
    if (!state || playerSlot === null || !battleId || !selectedSlotRequest) return;

    const move = selectedSlotRequest.moves[index];
    if (!move || move.disabled) return;

    const command: MoveCommand = {
      kind: "move",
      battleId,
      playerSlot,
      activeSlot: selectedSlotRequest.slot,
      turn: state.turn,
      stateHash: "",
      moveIndex: move.index,
      target: sideSize > 1 ? target : undefined,
      mega: !!megaEnabledSlots[selectedSlotRequest.slot],
      tera: !!teraEnabledSlots[selectedSlotRequest.slot],
      dynamax: !!dynamaxEnabledSlots[selectedSlotRequest.slot],
    };

    submitTurnChoice(command);
  }

  function submitSwitch(position: number) {
    if (!state || playerSlot === null || !battleId) return;

    const command: SwitchCommand = {
      kind: "switch",
      battleId,
      playerSlot,
      activeSlot: selectedSlotRequest?.slot ?? selectedActiveSlot,
      turn: state.turn,
      stateHash: "",
      partyIndex: position,
    };

    submitTurnChoice(command);
  }

  function submitShift() {
    if (!state || playerSlot === null || !battleId || !selectedSlotRequest || !canShift) return;

    const command: ShiftCommand = {
      kind: "shift",
      battleId,
      playerSlot,
      activeSlot: selectedSlotRequest.slot,
      turn: state.turn,
      stateHash: "",
    };

    submitTurnChoice(command);
  }

  function submitItem(itemId: string, targetPartyIndex?: number) {
    if (!state || playerSlot === null || !battleId || !selectedSlotRequest) return;

    const command: ItemCommand = {
      kind: "item",
      battleId,
      playerSlot,
      activeSlot: selectedSlotRequest.slot,
      turn: state.turn,
      stateHash: "",
      itemId,
      targetPartyIndex,
    };

    submitTurnChoice(command);
  }

  function toggleMega() {
    if (!selectedSlotRequest || !canMegaEvo) return;
    const slot = selectedSlotRequest.slot;
    setMegaEnabledSlots((current) => ({ ...current, [slot]: !current[slot] }));
    setTeraEnabledSlots((current) => ({ ...current, [slot]: false }));
    setDynamaxEnabledSlots((current) => ({ ...current, [slot]: false }));
  }

  function toggleTera() {
    if (!selectedSlotRequest || !canTerastallize) return;
    const slot = selectedSlotRequest.slot;
    setMegaEnabledSlots((current) => ({ ...current, [slot]: false }));
    setTeraEnabledSlots((current) => ({ ...current, [slot]: !current[slot] }));
    setDynamaxEnabledSlots((current) => ({ ...current, [slot]: false }));
  }

  function toggleDynamax() {
    if (!selectedSlotRequest || !canDynamax) return;
    const slot = selectedSlotRequest.slot;
    setMegaEnabledSlots((current) => ({ ...current, [slot]: false }));
    setTeraEnabledSlots((current) => ({ ...current, [slot]: false }));
    setDynamaxEnabledSlots((current) => ({ ...current, [slot]: !current[slot] }));
  }

  function handleCommandSelection(command: BattleCommandAction) {
    if (command === "FIGHT") {
      setPendingMoveIndex(null);
      setMenuState("fight");
      return;
    }

    if (command === "BAG") {
      setBagPocketIndex((current) =>
        current >= 0 && current < bagPockets.length ? current : firstBattleBagPocketIndex(),
      );
      setBagItemIndex((current) => Math.min(current, bagMaxIndex));
      setPartyMode("switch");
      setPendingBagItemId(null);
      setMenuState("bag");
      return;
    }

    if (command === "POKEMON") {
      if (request?.kind === "move" && selectedSlotRequest?.trapped) {
        setDisplayMessage("You can't switch out!");
        setMenuState(null);
        return;
      }
      if (availableSwitchPositions.size === 0) {
        setDisplayMessage("There are no other Pokemon to switch to.");
        setMenuState(null);
        return;
      }
      setPartyIndex(Math.min(...Array.from(availableSwitchPositions)));
      setPartyMode("switch");
      setPartyHelpText("Choose a Pokemon.");
      setMenuState("party");
      return;
    }

    if (command === "RUN") {
      onExit();
      return;
    }

    if (command === "CANCEL") {
      if (canStepBack) {
        stepBackChoice();
      } else {
        setMenuState(null);
      }
      return;
    }

    setDisplayMessage("Call isn't available in this battle.");
    setMenuState(null);
  }

  function confirmPartySelection() {
    if (!ourSide) return;
    if (partyMode === "bag") {
      if (partyIndex === 6) {
        setMenuState("bag");
        setPartyMode("switch");
        setPendingBagItemId(null);
        return;
      }
      const slot = ourSide.party[partyIndex];
      if (!slot || !pendingBagItemId) return;

      const itemMeta = getBattleBagItemMeta(pendingBagItemId);
      if (!itemMeta) {
        setDisplayMessage("This isn't the time to use that.");
        setMenuState(null);
        return;
      }
      if (itemMeta.useType === "battler" && !activePositions.has(partyIndex)) {
        setPartyHelpText("Use on which Pokemon?");
        return;
      }
      submitItem(pendingBagItemId, slot.position);
      return;
    }

    if (partyIndex === 6) {
      if (canCancelParty) {
        setMenuState("command");
        setPartyHelpText("Choose a Pokemon.");
      } else if (canStepBack) {
        stepBackChoice();
      }
      return;
    }

    const slot = ourSide.party[partyIndex];
    if (!slot) return;

    if (activePositions.has(partyIndex)) {
      setPartyHelpText("That Pokemon is already in battle.");
      return;
    }
    if (slot.hpStatus === "fainted") {
      setPartyHelpText("That Pokemon can't battle.");
      return;
    }
    if (!availableSwitchPositions.has(partyIndex)) {
      setPartyHelpText("That Pokemon can't be switched in.");
      return;
    }

    submitSwitch(slot.position + 1);
  }

  function confirmBagSelection() {
    const item = bagPocket.items[bagItemIndex] ?? null;
    if (!item) {
      setMenuState("command");
      return;
    }

    const itemMeta = getBattleBagItemMeta(item.id);
    if (!itemMeta) {
      setDisplayMessage("This isn't the time to use that.");
      setMenuState(null);
      return;
    }

    if (itemMeta.useType === "field" || itemMeta.useType === "ball") {
      setDisplayMessage(itemMeta.failureText);
      setMenuState(null);
      return;
    }

    if (itemMeta.useType === "no-target") {
      submitItem(item.id);
      return;
    }

    setPendingBagItemId(item.id);
    setPartyMode("bag");
    setPartyHelpText("Use on which Pokemon?");
    if (itemMeta.useType === "battler") {
      const activeIndex =
        currentActivePartyIndex ??
        Array.from(activePositions).sort((left, right) => left - right)[0] ??
        0;
      setPartyIndex(activeIndex);
    } else {
      setPartyIndex(currentActivePartyIndex ?? 0);
    }
    setMenuState("party");
  }

  function handleMoveSelection(index: number) {
    if (!selectedSlotRequest) return;

    const move = selectedSlotRequest.moves[index];
    if (!move || move.disabled) return;

    const options = buildTargetOptions(
      ourSide,
      foeSide,
      sideSize,
      selectedSlotRequest.slot,
      move.target,
    );
    if (options.length > 1) {
      setPendingMoveIndex(index);
      setTargetIndex(
        initialTargetScreenIndex(options, selectedSlotRequest.slot, sideSize, move.target),
      );
      setMenuState("target");
      return;
    }

    submitMove(index, sideSize > 1 ? options[0]?.targetLoc : undefined);
  }

  function confirmTargetSelection() {
    if (pendingMoveIndex === null) return;
    const option = targetOptions.find((candidate) => candidate.screenIndex === targetIndex);
    if (!option) return;
    submitMove(pendingMoveIndex, option.targetLoc);
  }

  useEffect(() => {
    if (!state) return;
    const messages = state.messageQueue;
    if (messages.length > 0) {
      setDisplayMessage(messages[messages.length - 1].text);
    }
  }, [state?.messageQueue]);

  useEffect(() => {
    if (!state || playerSlot === null) return;

    const firstSlot = slotRequests[0]?.slot ?? 0;
    const firstAvailableSwitchIndex = availableSwitchList[0] ?? 0;
    setSelectedActiveSlot(firstSlot);
    setQueuedChoices([]);
    setPartyMode("switch");
    setPendingBagItemId(null);
    setPendingMoveIndex(null);
    setTargetIndex(0);
    setMegaEnabledSlots({});
    setTeraEnabledSlots({});
    setDynamaxEnabledSlots({});

    if (state.phase === "ended") {
      setMenuState(null);
    } else if (request?.kind === "move" && state.phase === "command") {
      setMenuState("command");
      setCommandIndex(0);
      setMoveIndex(0);
    } else if (request?.kind === "switch") {
      setPartyMode("switch");
      setMenuState("party");
      setPartyIndex(firstAvailableSwitchIndex);
      setPartyHelpText("Choose a Pokemon.");
    } else if (
      request?.kind === "team" ||
      state.phase === "resolving" ||
      state.phase === "preview"
    ) {
      setMenuState(null);
    }
  }, [requestKey, playerSlot, state?.phase, availableSwitchKey, slotRequests]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Enter",
          "Escape",
          " ",
          "Shift",
          "z",
          "Z",
          "a",
          "A",
          "s",
          "S",
          "d",
          "D",
          "x",
          "X",
        ].includes(event.key)
      ) {
        event.preventDefault();
      }

      if (battleEnded) {
        if (event.key === "Enter" || event.key === "Escape") onExit();
        return;
      }

      if (!started && (event.key === "Enter" || event.key === " ")) {
        setStarted(true);
        return;
      }

      if (
        menuState === null &&
        status === "active" &&
        state?.phase === "command" &&
        displayMessage &&
        (event.key === "Enter" || event.key === "Escape" || event.key === "z" || event.key === "Z")
      ) {
        setDisplayMessage(null);
        setMenuState(request?.kind === "switch" ? "party" : "command");
        return;
      }

      if (event.key === "Escape") {
        if (menuState === "target") {
          setPendingMoveIndex(null);
          setMenuState("fight");
        } else if (menuState === "fight") {
          setMenuState("command");
        } else if (menuState === "bag") {
          setMenuState("command");
        } else if (menuState === "party") {
          if (partyMode === "bag") {
            setMenuState("bag");
            setPartyMode("switch");
            setPendingBagItemId(null);
          } else if (canCancelParty) {
            setMenuState("command");
            setPartyHelpText("Choose a Pokemon.");
          } else if (canStepBack) {
            stepBackChoice();
          }
        } else if (menuState === "command" && canStepBack) {
          stepBackChoice();
        } else {
          onExit();
        }
        return;
      }

      if (menuState === "bag") {
        if (event.key === "ArrowRight") {
          cycleBagPocket(1);
        }
        if (event.key === "ArrowLeft") {
          cycleBagPocket(-1);
        }
        if (event.key === "ArrowDown") {
          setBagItemIndex((index) => moveVerticalListSelection(index, "down", bagMaxIndex));
        }
        if (event.key === "ArrowUp") {
          setBagItemIndex((index) => moveVerticalListSelection(index, "up", bagMaxIndex));
        }
        if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
          confirmBagSelection();
        }
        return;
      }

      if (menuState === "command") {
        if (event.key === "ArrowRight") {
          setCommandIndex((index) => (index % 2 === 0 ? index + 1 : index));
        }
        if (event.key === "ArrowLeft") {
          setCommandIndex((index) => (index % 2 === 1 ? index - 1 : index));
        }
        if (event.key === "ArrowDown") {
          setCommandIndex((index) => (index < 2 ? index + 2 : index));
        }
        if (event.key === "ArrowUp") {
          setCommandIndex((index) => (index >= 2 ? index - 2 : index));
        }
        if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
          handleCommandSelection(
            commandIndex === 0
              ? "FIGHT"
              : commandIndex === 1
                ? "BAG"
                : commandIndex === 2
                  ? "POKEMON"
                  : fourthAction,
          );
        }
        return;
      }

      if (menuState === "party") {
        if (event.key === "ArrowRight") {
          setPartyIndex((index) => movePartySelection(index, "right", showPartyCancel));
        }
        if (event.key === "ArrowLeft") {
          setPartyIndex((index) => movePartySelection(index, "left", showPartyCancel));
        }
        if (event.key === "ArrowDown") {
          setPartyIndex((index) => movePartySelection(index, "down", showPartyCancel));
        }
        if (event.key === "ArrowUp") {
          setPartyIndex((index) => movePartySelection(index, "up", showPartyCancel));
        }
        if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
          confirmPartySelection();
        }
        return;
      }

      if (menuState === "target") {
        if (event.key === "ArrowRight") {
          setTargetIndex((index) =>
            moveTargetSelection(index, "right", targetOptions, sideSizes),
          );
        }
        if (event.key === "ArrowLeft") {
          setTargetIndex((index) =>
            moveTargetSelection(index, "left", targetOptions, sideSizes),
          );
        }
        if (event.key === "ArrowDown") {
          setTargetIndex((index) =>
            moveTargetSelection(index, "down", targetOptions, sideSizes),
          );
        }
        if (event.key === "ArrowUp") {
          setTargetIndex((index) =>
            moveTargetSelection(index, "up", targetOptions, sideSizes),
          );
        }
        if (event.key === "Enter" || event.key === "z" || event.key === "Z") {
          confirmTargetSelection();
        }
        return;
      }

      if (menuState === "fight") {
        const columns = 2;

        if (event.key === "ArrowRight") {
          setMoveIndex((index) => Math.min(index + 1, currentMoves.length - 1));
        }
        if (event.key === "ArrowLeft") {
          setMoveIndex((index) => Math.max(index - 1, 0));
        }
        if (event.key === "ArrowDown") {
          setMoveIndex((index) => Math.min(index + columns, currentMoves.length - 1));
        }
        if (event.key === "ArrowUp") {
          setMoveIndex((index) => Math.max(index - columns, 0));
        }
        if (
          (event.key === "Enter" || event.key === "z" || event.key === "Z") &&
          currentMoves[moveIndex] &&
          !currentMoves[moveIndex].disabled
        ) {
          handleMoveSelection(moveIndex);
        }
        if ((event.key === "a" || event.key === "A" || event.key === "Shift") && canMegaEvo) {
          toggleMega();
        }
        if ((event.key === "s" || event.key === "S") && canTerastallize) {
          toggleTera();
        }
        if ((event.key === "d" || event.key === "D") && canDynamax) {
          toggleDynamax();
        }
        if ((event.key === "x" || event.key === "X") && canShift) {
          submitShift();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    battleEnded,
    started,
    menuState,
    state,
    displayMessage,
    request,
    commandIndex,
    fourthAction,
    canCancelParty,
    showPartyCancel,
    canStepBack,
    bagMaxIndex,
    bagItemIndex,
    bagPocket,
    bagPocketIndex,
    currentMoves,
    moveIndex,
    partyIndex,
    pendingMoveIndex,
    targetIndex,
    targetOptions,
    sideSizes,
    selectedActiveSlot,
    selectedSlotRequest,
    ourSide,
    activePositions,
    availableSwitchPositions,
    megaEnabledSlots,
    teraEnabledSlots,
    dynamaxEnabledSlots,
    canMegaEvo,
    canTerastallize,
    canDynamax,
    canShift,
    onExit,
    partyMode,
    pendingBagItemId,
  ]);

  let statusText = "";
  if (!started) statusText = "Press ENTER to battle!";
  else if (status === "connecting") statusText = "Connecting to battle server...";
  else if (status === "waiting") statusText = "Waiting for opponent...";
  else if (state?.pendingRequest?.kind === "team" || state?.phase === "preview") {
    statusText = "Preparing team order...";
  } else if (status === "active" && (!ourSide?.active.some(Boolean) || !foeSide?.active.some(Boolean))) {
    statusText = "Battle starting...";
  } else if (status === "error") {
    statusText = error ?? "Connection error";
  } else if (battleEnded) {
    statusText = state?.winnerName
      ? `${state.winnerName} wins!\nPress ENTER to exit.`
      : "Draw!\nPress ENTER to exit.";
  } else if (displayMessage) {
    statusText = displayMessage;
  }

  return (
    <PixelScreen>
      <div
        style={{
          position: "relative",
          width: 512,
          height: 384,
          overflow: "hidden",
          fontFamily: HUD_FONT,
        }}
      >
        {showLoadingOverlay && (
          <BattleLoadingScreen
            canActivate={!started}
            onActivate={!started ? () => setStarted(true) : undefined}
            showError={status === "error"}
            errorText={status === "error" ? statusText : null}
          />
        )}

        {showBattleScene && (
          <>
            <BattleField
              playerActive={ourSide?.active ?? []}
              foeActive={foeSide?.active ?? []}
              sideSize={sideSize}
              selection={selection}
            />

            <BattleHud
              playerActive={ourSide?.active ?? []}
              foeActive={foeSide?.active ?? []}
              playerParty={ourSide?.party ?? []}
              foeParty={foeSide?.party ?? []}
              sideSize={sideSize}
              selection={selection}
            />

            {menuState === "fight" ? (
              <BattleMoveMenu
                moves={currentMoves}
                selectedIndex={moveIndex}
                onSelect={handleMoveSelection}
                megaMode={canMegaEvo ? (megaEnabledSlots[selectedActiveSlot] ? 2 : 1) : 0}
                onToggleMega={canMegaEvo ? toggleMega : undefined}
                shiftMode={canShift ? 1 : 0}
                onShift={canShift ? submitShift : undefined}
              />
            ) : menuState === "target" ? (
              <BattleTargetMenu
                options={targetOptions}
                selectedScreenIndex={targetIndex}
                sideSizes={sideSizes}
                onSelect={(targetLoc) => {
                  if (pendingMoveIndex === null) return;
                  submitMove(pendingMoveIndex, targetLoc);
                }}
              />
            ) : menuState === "party" ? (
              <BattlePartyScreen
                party={ourSide?.party ?? []}
                selectedIndex={partyIndex}
                canCancel={showPartyCancel}
                activePositions={activePositions}
                helpText={partyHelpText}
                onSelectIndex={setPartyIndex}
                onConfirmSelection={confirmPartySelection}
              />
            ) : menuState === "bag" ? (
              <BattleBagScreen
                pockets={bagPockets}
                pocketIndex={bagPocketIndex}
                selectedIndex={bagItemIndex}
                onSelectPocket={setBagPocket}
                onCyclePocket={cycleBagPocket}
                onSelectIndex={setBagItemIndex}
                onConfirmSelection={confirmBagSelection}
              />
            ) : menuState === "command" ? (
              <BattleCommandMenu
                selectedIndex={commandIndex}
                pokemonName={currentPokemon?.name}
                fourthAction={fourthAction}
                onSelect={handleCommandSelection}
              />
            ) : (
              <BattleMessageBox text={statusText || "..."} />
            )}

            {menuState === "fight" && (canTerastallize || canDynamax) && (
              <div
                style={{
                  position: "absolute",
                  left: 324,
                  top: 246,
                  width: 180,
                  fontFamily: HUD_FONT,
                  fontSize: 12,
                  lineHeight: "14px",
                  color: "#f0f0f0",
                  textShadow: "1px 1px 0 #404048",
                  whiteSpace: "pre-wrap",
                  userSelect: "none",
                  imageRendering: "pixelated",
                }}
              >
                {[
                  canTerastallize
                    ? `TERA ${teraEnabledSlots[selectedActiveSlot] ? "ON" : "READY"}`
                    : null,
                  canDynamax
                    ? `DYNAMAX ${dynamaxEnabledSlots[selectedActiveSlot] ? "ON" : "READY"}`
                    : null,
                ]
                  .filter(Boolean)
                  .join("\n")}
              </div>
            )}
          </>
        )}

        {resultScreenMode ? (
          <BattleResultScreen
            result={resultScreenMode}
            onExit={onExit}
          />
        ) : battleEnded ? (
          <BattleMessageBox text={statusText} />
        ) : null}
      </div>
    </PixelScreen>
  );
};
