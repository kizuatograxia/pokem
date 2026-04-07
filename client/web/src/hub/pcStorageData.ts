export interface HubPartyMember {
  id: string;
  speciesKey: string;
  name: string;
  nationalDex: number;
  level: number;
  hp: number;
  maxHp: number;
  iconSrc: string;
  frontSpriteSrc: string;
  types: string[];
  abilityName: string | null;
  itemName: string | null;
  gender: "M" | "F" | null;
  shiny: boolean;
}

export interface HubStorageBox {
  id: string;
  name: string;
  wallpaperIndex: number;
  contents: Array<HubPartyMember | null>;
}

export const PARTY_SLOT_COUNT = 6;
export const STORAGE_BOX_CAPACITY = 30;

interface MemberSeed {
  speciesKey: string;
  name: string;
  nationalDex: number;
  level: number;
  hp?: number;
  maxHp?: number;
  types: string[];
  abilityName?: string | null;
  itemName?: string | null;
  gender?: "M" | "F" | null;
  shiny?: boolean;
}

function createMember(seed: MemberSeed, uniqueId: string): HubPartyMember {
  const maxHp = seed.maxHp ?? 120 + (seed.nationalDex % 45);
  const hp = seed.hp ?? maxHp;

  return {
    id: uniqueId,
    speciesKey: seed.speciesKey,
    name: seed.name,
    nationalDex: seed.nationalDex,
    level: seed.level,
    hp,
    maxHp,
    iconSrc: `/assets/sprites/pokemon/icons/${seed.speciesKey}.png`,
    frontSpriteSrc: `/assets/sprites/pokemon/front/${seed.speciesKey}.png`,
    types: seed.types,
    abilityName: seed.abilityName ?? null,
    itemName: seed.itemName ?? null,
    gender: seed.gender ?? null,
    shiny: seed.shiny ?? false,
  };
}

const PARTY_SEEDS: MemberSeed[] = [
  {
    speciesKey: "PIKACHU",
    name: "Pikachu",
    nationalDex: 25,
    level: 50,
    hp: 104,
    maxHp: 118,
    types: ["ELECTRIC"],
    abilityName: "Static",
    itemName: "Light Ball",
    gender: "M",
  },
  {
    speciesKey: "CHARIZARD",
    name: "Charizard",
    nationalDex: 6,
    level: 58,
    hp: 142,
    maxHp: 168,
    types: ["FIRE", "FLYING"],
    abilityName: "Blaze",
    itemName: "Charcoal",
    gender: "M",
  },
  {
    speciesKey: "LUCARIO",
    name: "Lucario",
    nationalDex: 448,
    level: 54,
    hp: 133,
    maxHp: 145,
    types: ["FIGHTING", "STEEL"],
    abilityName: "Inner Focus",
    itemName: "Wise Glasses",
    gender: "M",
  },
];

const BOX_SEEDS: MemberSeed[][] = [
  [
    {
      speciesKey: "VENUSAUR",
      name: "Venusaur",
      nationalDex: 3,
      level: 52,
      types: ["GRASS", "POISON"],
      abilityName: "Overgrow",
      itemName: "Miracle Seed",
      gender: "M",
    },
    {
      speciesKey: "BLASTOISE",
      name: "Blastoise",
      nationalDex: 9,
      level: 52,
      types: ["WATER"],
      abilityName: "Torrent",
      itemName: "Mystic Water",
      gender: "M",
    },
    {
      speciesKey: "GENGAR",
      name: "Gengar",
      nationalDex: 94,
      level: 51,
      types: ["GHOST", "POISON"],
      abilityName: "Cursed Body",
      itemName: "Spell Tag",
      gender: "M",
    },
    {
      speciesKey: "GARDEVOIR",
      name: "Gardevoir",
      nationalDex: 282,
      level: 50,
      types: ["PSYCHIC", "FAIRY"],
      abilityName: "Synchronize",
      itemName: "Twisted Spoon",
      gender: "F",
      shiny: true,
    },
    {
      speciesKey: "SNORLAX",
      name: "Snorlax",
      nationalDex: 143,
      level: 49,
      types: ["NORMAL"],
      abilityName: "Thick Fat",
      itemName: "Leftovers",
      gender: "M",
    },
    {
      speciesKey: "DRAGONITE",
      name: "Dragonite",
      nationalDex: 149,
      level: 56,
      types: ["DRAGON", "FLYING"],
      abilityName: "Inner Focus",
      itemName: "Lum Berry",
      gender: "M",
    },
    {
      speciesKey: "LAPRAS",
      name: "Lapras",
      nationalDex: 131,
      level: 47,
      types: ["WATER", "ICE"],
      abilityName: "Water Absorb",
      itemName: "Never-Melt Ice",
      gender: "F",
    },
    {
      speciesKey: "EEVEE",
      name: "Eevee",
      nationalDex: 133,
      level: 20,
      types: ["NORMAL"],
      abilityName: "Run Away",
      itemName: null,
      gender: "F",
    },
    {
      speciesKey: "UMBREON",
      name: "Umbreon",
      nationalDex: 197,
      level: 44,
      types: ["DARK"],
      abilityName: "Synchronize",
      itemName: "Black Glasses",
      gender: "M",
    },
    {
      speciesKey: "ESPEON",
      name: "Espeon",
      nationalDex: 196,
      level: 44,
      types: ["PSYCHIC"],
      abilityName: "Synchronize",
      itemName: "Twisted Spoon",
      gender: "F",
    },
    {
      speciesKey: "GARCHOMP",
      name: "Garchomp",
      nationalDex: 445,
      level: 57,
      types: ["DRAGON", "GROUND"],
      abilityName: "Rough Skin",
      itemName: "Soft Sand",
      gender: "M",
    },
    {
      speciesKey: "TYRANITAR",
      name: "Tyranitar",
      nationalDex: 248,
      level: 55,
      types: ["ROCK", "DARK"],
      abilityName: "Sand Stream",
      itemName: "Smooth Rock",
      gender: "M",
    },
  ],
  [
    {
      speciesKey: "SCIZOR",
      name: "Scizor",
      nationalDex: 212,
      level: 48,
      types: ["BUG", "STEEL"],
      abilityName: "Technician",
      itemName: "Metal Coat",
      gender: "M",
    },
    {
      speciesKey: "SALAMENCE",
      name: "Salamence",
      nationalDex: 373,
      level: 56,
      types: ["DRAGON", "FLYING"],
      abilityName: "Intimidate",
      itemName: "Dragon Fang",
      gender: "M",
    },
    {
      speciesKey: "GYARADOS",
      name: "Gyarados",
      nationalDex: 130,
      level: 50,
      types: ["WATER", "FLYING"],
      abilityName: "Intimidate",
      itemName: "Mystic Water",
      gender: "F",
    },
    {
      speciesKey: "ALAKAZAM",
      name: "Alakazam",
      nationalDex: 65,
      level: 49,
      types: ["PSYCHIC"],
      abilityName: "Synchronize",
      itemName: "Twisted Spoon",
      gender: "M",
    },
    {
      speciesKey: "MACHAMP",
      name: "Machamp",
      nationalDex: 68,
      level: 48,
      types: ["FIGHTING"],
      abilityName: "No Guard",
      itemName: "Black Belt",
      gender: "M",
    },
    {
      speciesKey: "ARCANINE",
      name: "Arcanine",
      nationalDex: 59,
      level: 47,
      types: ["FIRE"],
      abilityName: "Intimidate",
      itemName: "Charcoal",
      gender: "M",
    },
    {
      speciesKey: "TOGEKISS",
      name: "Togekiss",
      nationalDex: 468,
      level: 46,
      types: ["FAIRY", "FLYING"],
      abilityName: "Serene Grace",
      itemName: "Sharp Beak",
      gender: "F",
    },
    {
      speciesKey: "METAGROSS",
      name: "Metagross",
      nationalDex: 376,
      level: 58,
      types: ["STEEL", "PSYCHIC"],
      abilityName: "Clear Body",
      itemName: "Metal Coat",
      gender: null,
    },
    {
      speciesKey: "LUXRAY",
      name: "Luxray",
      nationalDex: 405,
      level: 45,
      types: ["ELECTRIC"],
      abilityName: "Intimidate",
      itemName: "Magnet",
      gender: "M",
    },
    {
      speciesKey: "STARAPTOR",
      name: "Staraptor",
      nationalDex: 398,
      level: 44,
      types: ["NORMAL", "FLYING"],
      abilityName: "Intimidate",
      itemName: "Sharp Beak",
      gender: "F",
    },
    {
      speciesKey: "MILOTIC",
      name: "Milotic",
      nationalDex: 350,
      level: 52,
      types: ["WATER"],
      abilityName: "Marvel Scale",
      itemName: "Mystic Water",
      gender: "F",
    },
    {
      speciesKey: "HERACROSS",
      name: "Heracross",
      nationalDex: 214,
      level: 43,
      types: ["BUG", "FIGHTING"],
      abilityName: "Guts",
      itemName: "Silver Powder",
      gender: "M",
    },
  ],
];

export function createInitialParty(): Array<HubPartyMember | null> {
  const party: Array<HubPartyMember | null> = PARTY_SEEDS.map((seed, index) =>
    createMember(seed, `party-${index + 1}`),
  );

  while (party.length < PARTY_SLOT_COUNT) {
    party.push(null);
  }

  return party;
}

export function createInitialStorageBoxes(): HubStorageBox[] {
  return Array.from({ length: 40 }, (_, boxIndex) => {
    const boxSeeds = BOX_SEEDS[boxIndex] ?? [];
    const contents: Array<HubPartyMember | null> = boxSeeds.map((seed, memberIndex) =>
      createMember(seed, `box-${boxIndex + 1}-${memberIndex + 1}`),
    );

    while (contents.length < STORAGE_BOX_CAPACITY) {
      contents.push(null);
    }

    return {
      id: `box-${boxIndex + 1}`,
      name: `Box ${String(boxIndex + 1).padStart(2, "0")}`,
      wallpaperIndex: boxIndex % 40,
      contents,
    };
  });
}
