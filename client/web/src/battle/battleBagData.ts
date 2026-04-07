export interface BattleBagItem {
  id: string;
  name: string;
  description: string;
  quantity: number | null;
  useType: "pokemon" | "battler" | "no-target" | "ball" | "field";
  failureText: string;
}

export interface BattleBagPocket {
  id: number;
  name: string;
  items: BattleBagItem[];
}

export const BATTLE_BAG_POCKETS: BattleBagPocket[] = [
  {
    id: 1,
    name: "ITEMS",
    items: [
      {
        id: "SUPERREPEL",
        name: "Super Repel",
        description: "Repels weak wild Pokemon for 200 steps.",
        quantity: 4,
        useType: "field",
        failureText: "This isn't the time to use that.",
      },
    ],
  },
  {
    id: 2,
    name: "MEDICINE",
    items: [
      {
        id: "POTION",
        name: "Potion",
        description: "Restores 20 HP to one Pokemon.",
        quantity: 3,
        useType: "pokemon",
        failureText: "It won't have any effect.",
      },
      {
        id: "SUPERPOTION",
        name: "Super Potion",
        description: "Restores 60 HP to one Pokemon.",
        quantity: 2,
        useType: "pokemon",
        failureText: "It won't have any effect.",
      },
      {
        id: "HYPERPOTION",
        name: "Hyper Potion",
        description: "Restores 120 HP to one Pokemon.",
        quantity: 1,
        useType: "pokemon",
        failureText: "It won't have any effect.",
      },
      {
        id: "FULLHEAL",
        name: "Full Heal",
        description: "Heals all status conditions of one Pokemon.",
        quantity: 2,
        useType: "pokemon",
        failureText: "It won't have any effect.",
      },
      {
        id: "FULLRESTORE",
        name: "Full Restore",
        description: "Fully restores HP and heals status conditions.",
        quantity: 1,
        useType: "pokemon",
        failureText: "It won't have any effect.",
      },
    ],
  },
  {
    id: 3,
    name: "POKE BALLS",
    items: [
      {
        id: "POKEBALL",
        name: "Poke Ball",
        description: "A device for catching wild Pokemon.",
        quantity: 10,
        useType: "ball",
        failureText: "You can't throw a Poke Ball!",
      },
      {
        id: "GREATBALL",
        name: "Great Ball",
        description: "A good, high-performance Ball.",
        quantity: 5,
        useType: "ball",
        failureText: "You can't throw a Poke Ball!",
      },
      {
        id: "ULTRABALL",
        name: "Ultra Ball",
        description: "A Ball with a high rate of success.",
        quantity: 2,
        useType: "ball",
        failureText: "You can't throw a Poke Ball!",
      },
    ],
  },
  {
    id: 4,
    name: "TMS",
    items: [],
  },
  {
    id: 5,
    name: "BERRIES",
    items: [
      {
        id: "SITRUSBERRY",
        name: "Sitrus Berry",
        description: "A Berry that restores HP to one Pokemon.",
        quantity: 3,
        useType: "pokemon",
        failureText: "It won't have any effect.",
      },
      {
        id: "LUMBERRY",
        name: "Lum Berry",
        description: "A Berry that heals any status condition.",
        quantity: 2,
        useType: "pokemon",
        failureText: "It won't have any effect.",
      },
    ],
  },
  {
    id: 6,
    name: "MAIL",
    items: [],
  },
  {
    id: 7,
    name: "BATTLE ITEMS",
    items: [
      {
        id: "DIREHIT",
        name: "Dire Hit",
        description: "Raises the critical-hit ratio during battle.",
        quantity: 1,
        useType: "battler",
        failureText: "It won't have any effect.",
      },
      {
        id: "GUARDSPEC",
        name: "Guard Spec.",
        description: "Prevents stat reduction during battle for a while.",
        quantity: 1,
        useType: "no-target",
        failureText: "It won't have any effect.",
      },
    ],
  },
  {
    id: 8,
    name: "KEY ITEMS",
    items: [
      {
        id: "BICYCLE",
        name: "Bicycle",
        description: "A folding bike that boosts movement speed.",
        quantity: null,
        useType: "field",
        failureText: "This isn't the time to use that.",
      },
    ],
  },
];

export const BAG_VISIBLE_ROWS = 7;

export function firstBattleBagPocketIndex(): number {
  const firstNonEmpty = BATTLE_BAG_POCKETS.findIndex((pocket) => pocket.items.length > 0);
  return firstNonEmpty >= 0 ? firstNonEmpty : 0;
}

const BATTLE_BAG_ITEM_META = new Map(
  BATTLE_BAG_POCKETS.flatMap((pocket) =>
    pocket.items.map((item) => [
      item.id,
      {
        pocketId: pocket.id,
        useType: item.useType,
        failureText: item.failureText,
      },
    ]),
  ),
);

export function getBattleBagItemMeta(itemId: string): {
  pocketId: number;
  useType: BattleBagItem["useType"];
  failureText: string;
} | null {
  return BATTLE_BAG_ITEM_META.get(itemId.toUpperCase()) ?? null;
}
