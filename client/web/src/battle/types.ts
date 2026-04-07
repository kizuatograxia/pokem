export type BattlePhase = "preview" | "command" | "resolving" | "ended";

export type BattleResult = "win" | "loss" | "tie" | null;

export type HPStatus = "alive" | "fainted";

export interface PokemonStatView {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface StatBoosts {
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
}

export type StatusCondition = "psn" | "tox" | "brn" | "par" | "slp" | "frz" | null;
export type VolatileStatus = string;

export interface ActivePokemonView {
  slot: number;
  speciesId: string;
  name: string;
  level: number;
  gender: "M" | "F" | "N";
  shiny: boolean;
  hpCurrent: number;
  hpMax: number;
  hpStatus: HPStatus;
  status: StatusCondition;
  volatiles: VolatileStatus[];
  boosts: StatBoosts;
  item: string | null;
  ability: string | null;
  moves: MoveSlotView[];
  isRevealed: boolean;
  teraType: string | null;
  isTerastallized: boolean;
}

export interface MoveSlotView {
  id: string;
  name: string;
  pp: number;
  maxPp: number;
  disabled: boolean;
}

export interface BattleSideView {
  playerSlot: 0 | 1;
  playerId: string;
  playerName: string;
  active: ActivePokemonView[];
  party: PartySlotView[];
  sideConditions: string[];
}

export interface PartySlotView {
  position: number;
  speciesId: string;
  name: string;
  level: number;
  gender: "M" | "F" | "N";
  shiny: boolean;
  hpPercent: number;
  hpCurrent: number | null;
  hpMax: number | null;
  hpStatus: HPStatus;
  status: StatusCondition;
  item: string | null;
  isRevealed: boolean;
}

export type WeatherState =
  | "sun"
  | "rain"
  | "sand"
  | "hail"
  | "snow"
  | "harshsun"
  | "heavyrain"
  | "strongwinds"
  | null;
export type TerrainState = "electric" | "grassy" | "misty" | "psychic" | null;

export interface FieldView {
  weather: WeatherState;
  weatherTurnsLeft: number | null;
  terrain: TerrainState;
  terrainTurnsLeft: number | null;
  pseudoWeather: string[];
}

export type BattleMessageKind =
  | "move"
  | "switch"
  | "damage"
  | "heal"
  | "status"
  | "weather"
  | "terrain"
  | "boost"
  | "faint"
  | "info"
  | "error";

export interface BattleMessage {
  id: string;
  kind: BattleMessageKind;
  text: string;
  meta?: Record<string, unknown>;
}

export interface BattleBagItemView {
  id: string;
  name: string;
  description: string;
  quantity: number | null;
}

export interface BattleBagPocketView {
  id: number;
  name: string;
  items: BattleBagItemView[];
}

export type RequestKind = "move" | "switch" | "team" | "wait";

export interface MoveRequestOption {
  index: number;
  id: string;
  name: string;
  typeId: string;
  target: string;
  pp: number;
  maxPp: number;
  disabled: boolean;
  canMegaEvo: boolean;
  canTerastallize: boolean;
  canDynamax: boolean;
}

export interface SwitchRequestOption {
  position: number;
  speciesId: string;
  name: string;
  hpPercent: number;
  hpStatus: HPStatus;
  status: StatusCondition;
}

export interface SlotRequest {
  slot: number;
  moves: MoveRequestOption[];
  forceSwitch: boolean;
  trapped: boolean;
}

export interface PlayerRequestView {
  kind: RequestKind;
  slots: SlotRequest[];
  switches: SwitchRequestOption[];
  noCancel: boolean;
}

export type SpriteStyle = "retro";
export type EffectStyle = "gba" | "nds" | "essentials";

export type EntryDirection = "left" | "right" | "below";

export type BattleAnimationCueData =
  | { kind: "switch-in"; side: number; slot: number; spriteId: string; entryFrom: EntryDirection }
  | { kind: "switch-out"; side: number; slot: number; spriteId: string }
  | { kind: "faint"; side: number; slot: number }
  | { kind: "move-use"; side: number; slot: number; moveId: string; typeId: string }
  | { kind: "damage-hit"; side: number; slot: number; hpPercentAfter: number; flashColor: string; from?: string }
  | { kind: "heal"; side: number; slot: number; hpPercentAfter: number; from?: string }
  | { kind: "status-apply"; side: number; slot: number; status: StatusCondition }
  | { kind: "boost"; side: number; slot: number; stat: string; dir: "rose" | "fell" }
  | { kind: "weather-change"; weather: WeatherState }
  | { kind: "terrain-change"; terrain: TerrainState }
  | { kind: "message"; text: string };

export type BattleAnimationCue = BattleAnimationCueData & { seq: number };

export type GameType = "singles" | "doubles" | "triples";

export interface BattleViewState {
  battleId: string;
  turn: number;
  phase: BattlePhase;
  format: string;
  gametype: GameType;
  spriteStyle: SpriteStyle;
  effectStyle: EffectStyle;
  sides: [BattleSideView, BattleSideView];
  field: FieldView;
  messageQueue: BattleMessage[];
  pendingRequest?: PlayerRequestView;
  animationQueue: BattleAnimationCue[];
  result: BattleResult;
  winnerName: string | null;
  bag?: BattleBagPocketView[];
}

export type PlayerCommandKind =
  | "move"
  | "switch"
  | "team"
  | "shift"
  | "item"
  | "multi-choice";

export interface MoveCommand {
  kind: "move";
  battleId: string;
  playerSlot: 0 | 1;
  activeSlot: number;
  turn: number;
  stateHash: string;
  moveIndex: number;
  target?: number;
  mega: boolean;
  tera: boolean;
  dynamax: boolean;
}

export interface SwitchCommand {
  kind: "switch";
  battleId: string;
  playerSlot: 0 | 1;
  activeSlot: number;
  turn: number;
  stateHash: string;
  partyIndex: number;
}

export interface TeamOrderCommand {
  kind: "team";
  battleId: string;
  playerSlot: 0 | 1;
  order: number[];
}

export interface ShiftCommand {
  kind: "shift";
  battleId: string;
  playerSlot: 0 | 1;
  activeSlot: number;
  turn: number;
  stateHash: string;
}

export interface ItemCommand {
  kind: "item";
  battleId: string;
  playerSlot: 0 | 1;
  activeSlot: number;
  turn: number;
  stateHash: string;
  itemId: string;
  targetPartyIndex?: number;
}

export interface SlotChoice {
  activeSlot: number;
  choice: MoveCommand | SwitchCommand | ShiftCommand | ItemCommand;
}

export interface MultiChoiceCommand {
  kind: "multi-choice";
  battleId: string;
  playerSlot: 0 | 1;
  turn: number;
  stateHash: string;
  choices: SlotChoice[];
}

export type PlayerCommand =
  | MoveCommand
  | SwitchCommand
  | TeamOrderCommand
  | ShiftCommand
  | ItemCommand
  | MultiChoiceCommand;
