// ─── BattleViewState ─────────────────────────────────────────────────────────
//
// This is the canonical view model that the frontend consumes.
// The Showdown adapter produces this. The frontend never reads raw Showdown
// protocol. All display logic is driven by snapshots of this type.
//
// ─────────────────────────────────────────────────────────────────────────────

export type BattlePhase =
  | 'preview'       // team preview / lead selection
  | 'command'       // waiting for player input
  | 'resolving'     // turn in progress
  | 'ended';        // battle over

export type BattleResult = 'win' | 'loss' | 'tie' | null;

// ─── Pokemon ─────────────────────────────────────────────────────────────────

export type HPStatus = 'alive' | 'fainted';

export interface PokemonStatView {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface StatBoosts {
  atk: number;   // -6 to +6
  def: number;
  spa: number;
  spd: number;
  spe: number;
  accuracy: number;
  evasion: number;
}

export type StatusCondition = 'psn' | 'tox' | 'brn' | 'par' | 'slp' | 'frz' | null;
export type VolatileStatus = string; // 'confusion', 'flinch', 'leechseed', etc.

export interface ActivePokemonView {
  slot: number;                     // 0 = left, 1 = right (doubles)
  speciesId: string;
  name: string;
  level: number;
  gender: 'M' | 'F' | 'N';
  shiny: boolean;
  hpCurrent: number;                // 0-100 (percent for opponent, exact for own side)
  hpMax: number;
  hpStatus: HPStatus;
  status: StatusCondition;
  volatiles: VolatileStatus[];
  boosts: StatBoosts;
  item: string | null;              // null = unknown (opponent)
  ability: string | null;           // null = unknown (opponent)
  moves: MoveSlotView[];            // empty for opponent until revealed
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

// ─── Side ────────────────────────────────────────────────────────────────────

export interface BattleSideView {
  playerSlot: 0 | 1;
  playerId: string;
  playerName: string;
  active: ActivePokemonView[];      // currently on field
  party: PartySlotView[];           // full party (6)
  sideConditions: string[];         // 'stealthrock', 'spikes1', etc.
}

export interface PartySlotView {
  position: number;                 // 0-5
  speciesId: string;
  name: string;
  level: number;
  gender: 'M' | 'F' | 'N';
  shiny: boolean;
  hpPercent: number;                // 0-100
  hpCurrent: number | null;
  hpMax: number | null;
  hpStatus: HPStatus;
  status: StatusCondition;
  item: string | null;
  isRevealed: boolean;
}

// ─── Field ───────────────────────────────────────────────────────────────────

export type WeatherState = 'sun' | 'rain' | 'sand' | 'hail' | 'snow' | 'harshsun' | 'heavyrain' | 'strongwinds' | null;
export type TerrainState = 'electric' | 'grassy' | 'misty' | 'psychic' | null;

export interface FieldView {
  weather: WeatherState;
  weatherTurnsLeft: number | null;  // null = permanent
  terrain: TerrainState;
  terrainTurnsLeft: number | null;
  pseudoWeather: string[];          // 'trickroom', 'gravity', 'magicroom', etc.
}

// ─── Messages ────────────────────────────────────────────────────────────────

export type BattleMessageKind =
  | 'move'
  | 'switch'
  | 'damage'
  | 'heal'
  | 'status'
  | 'weather'
  | 'terrain'
  | 'boost'
  | 'faint'
  | 'info'
  | 'error';

export interface BattleMessage {
  id: string;                       // monotonic, for ordering
  kind: BattleMessageKind;
  text: string;                     // human-readable log line
  meta?: Record<string, unknown>;   // optional extra data for rendering
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

// ─── Player Request ──────────────────────────────────────────────────────────
// Sent only to the player whose turn it is. Never leaked to spectators.

export type RequestKind = 'move' | 'switch' | 'team' | 'wait';

export interface MoveRequestOption {
  index: number;                    // 1-4
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
  position: number;                 // original 1-based team slot — use directly in /choose switch N
  speciesId: string;
  name: string;
  hpPercent: number;
  hpStatus: HPStatus;
  status: StatusCondition;
}

/** Per-active-slot request data. Singles always has one entry; doubles has two. */
export interface SlotRequest {
  slot: number;                     // active field slot index (0 or 1)
  moves: MoveRequestOption[];
  forceSwitch: boolean;             // this specific slot must switch
  trapped: boolean;                 // cannot switch voluntarily
}

export interface PlayerRequestView {
  kind: RequestKind;
  slots: SlotRequest[];             // one per active slot (1 = singles, 2 = doubles)
  switches: SwitchRequestOption[];  // shared bench pool with original party positions
  noCancel: boolean;
}

// ─── Animation Cues ──────────────────────────────────────────────────────────
// Ordered list of things the retro renderer consumes in sequence.
// Each variant carries exactly what a pixel/sprite renderer needs — no more.
//
// Conventions:
//   side     — ABSOLUTE: 0 = p1, 1 = p2. Always Showdown-side, never viewer-relative.
//              The renderer maps to "my side / opponent side" using its own viewerSide.
//              Retro layout convention: p1 renders at the bottom, p2 at the top/right.
//   slot     — active field slot index (0 for singles, 0|1 for doubles)
//   spriteId — lowercased species id used to resolve sprite asset path (e.g. 'charizard')

export type SpriteStyle = 'retro';
export type EffectStyle = 'gba' | 'nds' | 'essentials';

/** Direction a pokemon sprite slides in from when entering the field. */
export type EntryDirection = 'left' | 'right' | 'below';

/** Union of all animation payloads, without the monotonic seq counter. */
export type BattleAnimationCueData =
  | { kind: 'switch-in';      side: number; slot: number; spriteId: string; entryFrom: EntryDirection }
  | { kind: 'switch-out';     side: number; slot: number; spriteId: string }
  | { kind: 'faint';          side: number; slot: number }
  | { kind: 'move-use';       side: number; slot: number; moveId: string; typeId: string }
  | { kind: 'damage-hit';     side: number; slot: number; hpPercentAfter: number; flashColor: string; from?: string }
  | { kind: 'heal';           side: number; slot: number; hpPercentAfter: number; from?: string }
  | { kind: 'status-apply';   side: number; slot: number; status: StatusCondition }
  | { kind: 'boost';          side: number; slot: number; stat: string; dir: 'rose' | 'fell' }
  | { kind: 'weather-change'; weather: WeatherState }
  | { kind: 'terrain-change'; terrain: TerrainState }
  | { kind: 'message';        text: string };

/** Animation cue with its monotonic sequence number for ordering. */
export type BattleAnimationCue = BattleAnimationCueData & { seq: number };

// ─── Top-level State ─────────────────────────────────────────────────────────

export type GameType = 'singles' | 'doubles' | 'triples';

export interface BattleViewState {
  battleId: string;
  turn: number;
  phase: BattlePhase;
  format: string;                   // ruleset id, e.g. 'gen9ou' — set at construction, never overwritten
  gametype: GameType;               // battlefield shape from |gametype| — separate from format
  spriteStyle: SpriteStyle;         // always 'retro' for this project
  effectStyle: EffectStyle;         // 'gba' | 'nds' | 'essentials' — drives animation variant
  sides: [BattleSideView, BattleSideView];
  field: FieldView;
  messageQueue: BattleMessage[];
  pendingRequest?: PlayerRequestView;   // undefined for spectators and opponent
  animationQueue: BattleAnimationCue[];
  result: BattleResult;
  winnerName: string | null;
  bag?: BattleBagPocketView[];
}

// ─── Commands ────────────────────────────────────────────────────────────────
// What the player sends to our backend. We translate to Showdown /choose.

export type PlayerCommandKind = 'move' | 'switch' | 'team' | 'shift' | 'item' | 'multi-choice';

export interface MoveCommand {
  kind: 'move';
  battleId: string;
  playerSlot: 0 | 1;
  activeSlot: number;   // 0 for singles/first slot, 1 for second doubles slot
  turn: number;
  stateHash: string;
  moveIndex: number;    // 1-4
  /**
   * Doubles target slot in Showdown's numbering.
   * Adjacent foes:  -1 (near) | 1 (near other side) | -2 / 2 (far, triples)
   * Ally:           positive slot number of the ally
   * Self-targeting: omit or 0
   * Singles:        omit — Showdown ignores target for singles
   */
  target?: number;
  mega: boolean;
  tera: boolean;
  dynamax: boolean;
}

export interface SwitchCommand {
  kind: 'switch';
  battleId: string;
  playerSlot: 0 | 1;
  activeSlot: number;   // which active slot is switching out
  turn: number;
  stateHash: string;
  partyIndex: number;   // original 1-based team position — straight from SwitchRequestOption.position
}

export interface TeamOrderCommand {
  kind: 'team';
  battleId: string;
  playerSlot: 0 | 1;
  order: number[];      // lead positions 1-6 in desired order
}

export interface ShiftCommand {
  kind: 'shift';
  battleId: string;
  playerSlot: 0 | 1;
  activeSlot: number;
  turn: number;
  stateHash: string;
}

export interface ItemCommand {
  kind: 'item';
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
  kind: 'multi-choice';
  battleId: string;
  playerSlot: 0 | 1;
  turn: number;
  stateHash: string;
  choices: SlotChoice[];   // one per active slot that needs a choice
}

export type PlayerCommand =
  | MoveCommand
  | SwitchCommand
  | TeamOrderCommand
  | ShiftCommand
  | ItemCommand
  | MultiChoiceCommand;
