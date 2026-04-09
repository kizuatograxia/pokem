export interface BattleTeamEntry {
  id: string;
  name: string;
  iconSrc: string;
  packed: string;
  summary: string;
}

const entry = (
  id: string,
  name: string,
  packed: string,
  summary: string,
): BattleTeamEntry => ({
  id,
  name,
  iconSrc: `/assets/sprites/pokemon/icons/${id}.png`,
  packed,
  summary,
});

export const BATTLE_TEAM_CATALOG: BattleTeamEntry[] = [
  entry(
    "PIKACHU",
    "Pikachu",
    "Pikachu||lightball||thunderbolt,quickattack,irontail,volttackle|Timid|,,,252,,252|M|||||",
    "Electric sweeper",
  ),
  entry(
    "CHARIZARD",
    "Charizard",
    "Charizard||choicespecs||flamethrower,airslash,focusblast,dragonpulse|Timid|,,,252,,252|M|||||",
    "Fast special attacker",
  ),
  entry(
    "BLASTOISE",
    "Blastoise",
    "Blastoise||leftovers||scald,icebeam,rapidspin,aura sphere|Bold|252,,252,,,4|M|||||",
    "Bulky water tank",
  ),
  entry(
    "VENUSAUR",
    "Venusaur",
    "Venusaur||blacksludge||gigadrain,sludgebomb,synthesis,sleeppowder|Calm|252,,4,,252,|M|||||",
    "Status support",
  ),
  entry(
    "GENGAR",
    "Gengar",
    "Gengar||lifeorb||shadowball,sludgebomb,focusblast,thunderbolt|Timid|,,,252,,252|M|||||",
    "Glass cannon",
  ),
  entry(
    "SNORLAX",
    "Snorlax",
    "Snorlax||leftovers||bodyslam,earthquake,crunch,rest|Careful|188,144,176,,,|M|||||",
    "Special wall",
  ),
  entry(
    "LUCARIO",
    "Lucario",
    "Lucario||lifeorb||closecombat,extremespeed,crunch,swordsdance|Jolly|,252,4,,,252|M|||||",
    "Physical cleaner",
  ),
  entry(
    "GARDEVOIR",
    "Gardevoir",
    "Gardevoir||choicescarf||moonblast,psychic,thunderbolt,trick|Timid|,,,252,,252|F|||||",
    "Speed control",
  ),
  entry(
    "DRAGONITE",
    "Dragonite",
    "Dragonite||lumberry||dragonclaw,earthquake,extremespeed,dragondance|Jolly|,252,4,,,252|M|||||",
    "Set-up sweeper",
  ),
  entry(
    "LAPRAS",
    "Lapras",
    "Lapras||leftovers||freezedry,scald,thunderbolt,icebeam|Modest|252,,,252,4,|F|||||",
    "Ice-water coverage",
  ),
  entry(
    "GARCHOMP",
    "Garchomp",
    "Garchomp||choicescarf||earthquake,dragonclaw,stoneedge,poisonjab|Jolly|,252,4,,,252|M|||||",
    "Scarf revenge killer",
  ),
  entry(
    "TYRANITAR",
    "Tyranitar",
    "Tyranitar||choiceband||stoneedge,crunch,earthquake,superpower|Adamant|252,252,,,,4|M|||||",
    "Sand breaker",
  ),
  entry(
    "EEVEE",
    "Eevee",
    "Eevee||eviolite||quickattack,return,bite,protect|Jolly|4,252,,,,252|F|||||",
    "Eviolite pivot",
  ),
  entry(
    "UMBREON",
    "Umbreon",
    "Umbreon||leftovers||foulplay,wish,protect,toxic|Calm|252,,,,252,4|M|||||",
    "Wish wall",
  ),
  entry(
    "ESPEON",
    "Espeon",
    "Espeon||lifeorb||psychic,shadowball,dazzlinggleam,calmmind|Timid|4,,,252,,252|F|||||",
    "Magic bounce attacker",
  ),
  entry(
    "SCIZOR",
    "Scizor",
    "Scizor||choiceband||bulletpunch,uturn,superpower,pursuit|Adamant|248,252,,,,8|M|||||",
    "Priority breaker",
  ),
  entry(
    "SALAMENCE",
    "Salamence",
    "Salamence||lifeorb||dragonclaw,earthquake,fireblast,dragondance|Naive|,252,,4,,252|M|||||",
    "Mixed dragon dancer",
  ),
  entry(
    "GYARADOS",
    "Gyarados",
    "Gyarados||leftovers||waterfall,icefang,earthquake,dragondance|Jolly|,252,4,,,252|F|||||",
    "Intimidate sweeper",
  ),
  entry(
    "ALAKAZAM",
    "Alakazam",
    "Alakazam||focussash||psychic,focusblast,shadowball,encore|Timid|4,,,252,,252|M|||||",
    "Fast sash lead",
  ),
  entry(
    "MACHAMP",
    "Machamp",
    "Machamp||leftovers||dynamicpunch,stoneedge,knockoff,bulletpunch|Adamant|252,252,4,,,|M|||||",
    "No Guard bruiser",
  ),
  entry(
    "ARCANINE",
    "Arcanine",
    "Arcanine||leftovers||flareblitz,extremespeed,wildcharge,morningsun|Jolly|248,252,,,8,|M|||||",
    "Bulky revenge fire",
  ),
  entry(
    "TOGEKISS",
    "Togekiss",
    "Togekiss||leftovers||airslash,aurasphere,roost,thunderwave|Calm|252,,,4,252,|F|||||",
    "Para-flinch support",
  ),
  entry(
    "METAGROSS",
    "Metagross",
    "Metagross||assaultvest||meteormash,zenheadbutt,earthquake,bulletpunch|Adamant|252,252,4,,,||||||",
    "Bulky steel tank",
  ),
  entry(
    "LUXRAY",
    "Luxray",
    "Luxray||choiceband||wildcharge,crunch,icefang,superpower|Jolly|,252,4,,,252|M|||||",
    "Intimidate breaker",
  ),
  entry(
    "STARAPTOR",
    "Staraptor",
    "Staraptor||choiceband||bravebird,closecombat,doubleedge,uturn|Jolly|,252,4,,,252|F|||||",
    "Reckless cleaner",
  ),
  entry(
    "MILOTIC",
    "Milotic",
    "Milotic||leftovers||scald,icebeam,recover,toxic|Bold|252,,252,,4,|F|||||",
    "Marvel Scale wall",
  ),
  entry(
    "HERACROSS",
    "Heracross",
    "Heracross||choicescarf||closecombat,megahorn,stoneedge,knockoff|Jolly|,252,4,,,252|M|||||",
    "Scarf bug fighter",
  ),
];

export const DEFAULT_QUICK_BATTLE_TEAM = [
  "PIKACHU",
  "CHARIZARD",
  "BLASTOISE",
  "VENUSAUR",
  "GENGAR",
  "SNORLAX",
] as const;

export const BATTLE_TEAM_ENTRY_BY_ID = new Map(
  BATTLE_TEAM_CATALOG.map((candidate) => [candidate.id, candidate] as const),
);

export function buildPackedTeam(teamIds: string[]): string {
  return teamIds
    .map((teamId) => BATTLE_TEAM_ENTRY_BY_ID.get(teamId)?.packed ?? "")
    .filter(Boolean)
    .join("]");
}
