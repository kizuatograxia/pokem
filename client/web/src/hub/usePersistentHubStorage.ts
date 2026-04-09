import { useEffect, useRef, useState } from "react";
import {
  createInitialParty,
  createInitialStorageBoxes,
  type HubPartyMember,
  type HubStorageBox,
} from "./pcStorageData.js";

const STORAGE_KEY = "battle-tower-pc-state-v1";

interface HubStorageSnapshot {
  party: Array<HubPartyMember | null>;
  storageBoxes: HubStorageBox[];
}

function createDefaultSnapshot(): HubStorageSnapshot {
  return {
    party: createInitialParty(),
    storageBoxes: createInitialStorageBoxes(),
  };
}

function isMemberLike(value: unknown): value is HubPartyMember | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<HubPartyMember>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.speciesKey === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.iconSrc === "string" &&
    typeof candidate.frontSpriteSrc === "string"
  );
}

function isStorageBoxLike(value: unknown): value is HubStorageBox {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<HubStorageBox>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.wallpaperIndex === "number" &&
    Array.isArray(candidate.contents) &&
    candidate.contents.every((member) => isMemberLike(member))
  );
}

function loadStoredSnapshot(): HubStorageSnapshot {
  if (typeof window === "undefined") {
    return createDefaultSnapshot();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultSnapshot();
    }

    const parsed = JSON.parse(raw) as Partial<HubStorageSnapshot>;
    if (
      !Array.isArray(parsed.party) ||
      !parsed.party.every((member) => isMemberLike(member)) ||
      !Array.isArray(parsed.storageBoxes) ||
      !parsed.storageBoxes.every((box) => isStorageBoxLike(box))
    ) {
      return createDefaultSnapshot();
    }

    return {
      party: parsed.party,
      storageBoxes: parsed.storageBoxes,
    };
  } catch {
    return createDefaultSnapshot();
  }
}

export function usePersistentHubStorage() {
  const initialSnapshotRef = useRef<HubStorageSnapshot | null>(null);
  if (initialSnapshotRef.current === null) {
    initialSnapshotRef.current = loadStoredSnapshot();
  }

  const [party, setParty] = useState<Array<HubPartyMember | null>>(
    initialSnapshotRef.current.party,
  );
  const [storageBoxes, setStorageBoxes] = useState<HubStorageBox[]>(
    initialSnapshotRef.current.storageBoxes,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        party,
        storageBoxes,
      }),
    );
  }, [party, storageBoxes]);

  return {
    party,
    setParty,
    storageBoxes,
    setStorageBoxes,
  };
}
