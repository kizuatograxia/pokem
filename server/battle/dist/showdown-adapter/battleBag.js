const DEFAULT_BATTLE_BAG = [
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
            },
            {
                id: "SUPERPOTION",
                name: "Super Potion",
                description: "Restores 60 HP to one Pokemon.",
                quantity: 2,
                useType: "pokemon",
            },
            {
                id: "HYPERPOTION",
                name: "Hyper Potion",
                description: "Restores 120 HP to one Pokemon.",
                quantity: 1,
                useType: "pokemon",
            },
            {
                id: "FULLHEAL",
                name: "Full Heal",
                description: "Heals all status conditions of one Pokemon.",
                quantity: 2,
                useType: "pokemon",
            },
            {
                id: "FULLRESTORE",
                name: "Full Restore",
                description: "Fully restores HP and heals status conditions.",
                quantity: 1,
                useType: "pokemon",
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
            },
            {
                id: "GREATBALL",
                name: "Great Ball",
                description: "A good, high-performance Ball.",
                quantity: 5,
                useType: "ball",
            },
            {
                id: "ULTRABALL",
                name: "Ultra Ball",
                description: "A Ball with a high rate of success.",
                quantity: 2,
                useType: "ball",
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
            },
            {
                id: "LUMBERRY",
                name: "Lum Berry",
                description: "A Berry that heals any status condition.",
                quantity: 2,
                useType: "pokemon",
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
            },
            {
                id: "GUARDSPEC",
                name: "Guard Spec.",
                description: "Prevents stat reduction during battle for a while.",
                quantity: 1,
                useType: "no-target",
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
            },
        ],
    },
];
export function createBattleBagState() {
    return structuredClone(DEFAULT_BATTLE_BAG);
}
export function toBattleBagView(pockets) {
    return pockets.map((pocket) => ({
        id: pocket.id,
        name: pocket.name,
        items: pocket.items
            .filter((item) => item.quantity === null || item.quantity > 0)
            .map(({ id, name, description, quantity }) => ({
            id,
            name,
            description,
            quantity,
        })),
    }));
}
export function findBattleBagItem(pockets, itemId) {
    const normalizedId = itemId.toUpperCase();
    for (const pocket of pockets) {
        const item = pocket.items.find((candidate) => candidate.id === normalizedId);
        if (item) {
            return { pocket, item };
        }
    }
    return null;
}
