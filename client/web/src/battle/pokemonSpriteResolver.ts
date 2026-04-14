import { useEffect, useState } from "react";
import type { ActivePokemonView, PartySlotView } from "./types.js";

type SpriteSubject = Pick<ActivePokemonView, "speciesId" | "gender" | "shiny">;
type PartySpriteSubject = Pick<PartySlotView, "speciesId" | "gender" | "shiny">;
type BattleSpriteFolder = "front" | "back";

const FORM_STEM_OVERRIDES: Record<string, string> = {
  basculinbluestriped: "BASCULIN_1",
  burmysandy: "BURMY_1",
  burmytrash: "BURMY_2",
  castformrainy: "CASTFORM_2",
  castformsnowy: "CASTFORM_3",
  castformsunny: "CASTFORM_1",
  cherrimsunshine: "CHERRIM_1",
  darmanitanzen: "DARMANITAN_1",
  deoxysattack: "DEOXYS_1",
  deoxysdefense: "DEOXYS_2",
  deoxysspeed: "DEOXYS_3",
  gastrodoneast: "GASTRODON_1",
  giratinaorigin: "GIRATINA_1",
  meloettapirouette: "MELOETTA_1",
  rotomfan: "ROTOM_4",
  rotomfrost: "ROTOM_3",
  rotomheat: "ROTOM_1",
  rotommow: "ROTOM_5",
  rotomwash: "ROTOM_2",
  sawsbuckautumn: "SAWSBUCK_2",
  sawsbucksummer: "SAWSBUCK_1",
  sawsbuckwinter: "SAWSBUCK_3",
  shelloseast: "SHELLOS_1",
  shayminsky: "SHAYMIN_1",
  wormadamsandy: "WORMADAM_1",
  wormadamtrash: "WORMADAM_2",
};

const STEM_ALIAS_OVERRIDES: Record<string, string> = {
  nidoranf: "NIDORANfE",
  nidoranm: "NIDORANmA",
};

const imageExistsCache = new Map<string, boolean>();

function normalizeSpeciesId(speciesId: string): string {
  return speciesId.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalBaseStem(speciesId: string): string {
  return normalizeSpeciesId(speciesId).toUpperCase();
}

function appendUnique(target: string[], value: string | undefined): void {
  if (!value || target.includes(value)) return;
  target.push(value);
}

function baseStemFromVariant(stem: string): string {
  return stem.replace(/_female$/i, "").replace(/_\d+$/i, "");
}

function buildStemCandidates(subject: SpriteSubject | PartySpriteSubject): string[] {
  const normalizedId = normalizeSpeciesId(subject.speciesId);
  const baseStem = canonicalBaseStem(subject.speciesId);
  const overrideStem = FORM_STEM_OVERRIDES[normalizedId];
  const aliasStem = STEM_ALIAS_OVERRIDES[normalizedId];
  const stems: string[] = [];

  if (subject.gender === "F") {
    appendUnique(stems, overrideStem ? `${overrideStem}_female` : undefined);
    appendUnique(stems, aliasStem ? `${aliasStem}_female` : undefined);
    appendUnique(stems, `${baseStem}_female`);
  }

  appendUnique(stems, overrideStem);
  appendUnique(stems, aliasStem);

  if (overrideStem) {
    const baseVariantStem = baseStemFromVariant(overrideStem);
    if (subject.gender === "F") {
      appendUnique(stems, `${baseVariantStem}_female`);
    }
    appendUnique(stems, baseVariantStem);
  }

  appendUnique(stems, baseStem);
  return stems;
}

function buildFolderCandidates(folder: string, stems: string[]): string[] {
  return stems.map((stem) => `/assets/sprites/pokemon/${folder}/${stem}.png`);
}

async function imageExists(url: string): Promise<boolean> {
  const cached = imageExistsCache.get(url);
  if (cached !== undefined) {
    return cached;
  }

  const ok = await new Promise<boolean>((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });

  imageExistsCache.set(url, ok);
  return ok;
}

export function useResolvedImageUrl(candidates: string[]): string | null {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(() => {
    for (const candidate of candidates) {
      if (imageExistsCache.get(candidate)) {
        return candidate;
      }
    }
    return null;
  });

  const cacheKey = candidates.join("|");

  useEffect(() => {
    let cancelled = false;
    const cachedCandidate =
      candidates.find((candidate) => imageExistsCache.get(candidate) === true) ?? null;

    setResolvedUrl(cachedCandidate);
    if (cachedCandidate) {
      return () => {
        cancelled = true;
      };
    }

    async function resolveFirstAvailable(): Promise<void> {
      for (const candidate of candidates) {
        const ok = await imageExists(candidate);
        if (cancelled) return;
        if (ok) {
          setResolvedUrl(candidate);
          return;
        }
      }

      if (!cancelled) {
        setResolvedUrl(null);
      }
    }

    void resolveFirstAvailable();

    return () => {
      cancelled = true;
    };
  }, [cacheKey]);

  return resolvedUrl;
}

export function getBattleSpriteCandidates(
  pokemon: SpriteSubject,
  isBack: boolean,
): { animated: string[]; static: string[] } {
  const folder: BattleSpriteFolder = isBack ? "back" : "front";
  const stems = buildStemCandidates(pokemon);
  const animated = pokemon.shiny
    ? []
    : buildFolderCandidates(`animated/${folder}`, stems);
  const staticCandidates = pokemon.shiny
    ? [
        ...buildFolderCandidates(`${folder}-shiny`, stems),
        ...buildFolderCandidates(folder, stems),
      ]
    : buildFolderCandidates(folder, stems);

  const staticFallback = `/assets/sprites/pokemon/${folder}/000.png`;
  if (!staticCandidates.includes(staticFallback)) {
    staticCandidates.push(staticFallback);
  }

  return {
    animated,
    static: staticCandidates,
  };
}

export function getPartyIconCandidates(pokemon: PartySpriteSubject): string[] {
  const stems = buildStemCandidates(pokemon);
  const candidates = pokemon.shiny
    ? [
        ...buildFolderCandidates("icons-shiny", stems),
        ...buildFolderCandidates("icons", stems),
      ]
    : buildFolderCandidates("icons", stems);

  const fallback = "/assets/sprites/pokemon/icons/000.png";
  if (!candidates.includes(fallback)) {
    candidates.push(fallback);
  }

  return candidates;
}
