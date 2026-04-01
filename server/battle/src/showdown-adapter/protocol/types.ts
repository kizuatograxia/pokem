// Typed representation of Showdown battle protocol messages.
// Reference: https://github.com/smogon/pokemon-showdown/blob/master/sim/SIM-PROTOCOL.md

export type SdSide = 'p1' | 'p2';
export type SdSlot = `${SdSide}a` | `${SdSide}b` | `${SdSide}c`; // singles = pa/pb irrelevant

export interface SdPokemonIdent {
  side: SdSide;
  slot: string;        // 'a', 'b', 'c'
  name: string;        // display name
  species: string;     // species id (from details)
  level: number;
  gender: 'M' | 'F' | 'N';
  shiny: boolean;
}

// All possible parsed protocol events
export type SdEvent =
  | { type: 'player';     side: SdSide; name: string; avatar: string }
  | { type: 'teamsize';   side: SdSide; size: number }
  | { type: 'gametype';   format: string }
  | { type: 'gen';        gen: number }
  | { type: 'tier';       name: string }
  | { type: 'teampreview' }
  | { type: 'start' }
  | { type: 'turn';       turn: number }
  | { type: 'win';        player: string }
  | { type: 'tie' }
  | { type: 'switch';     ident: SdPokemonIdent; hpStatus: string; side: SdSide }
  | { type: 'drag';       ident: SdPokemonIdent; hpStatus: string; side: SdSide }
  | { type: 'faint';      ident: SdPokemonIdent }
  | { type: 'move';       ident: SdPokemonIdent; moveName: string; targetIdent: SdPokemonIdent | null; missed: boolean }
  | { type: 'damage';     ident: SdPokemonIdent; hpStatus: string; from?: string }
  | { type: 'heal';       ident: SdPokemonIdent; hpStatus: string; from?: string }
  | { type: 'sethp';      ident: SdPokemonIdent; hpStatus: string }
  | { type: 'status';     ident: SdPokemonIdent; status: string }
  | { type: 'curestatus'; ident: SdPokemonIdent; status: string }
  | { type: 'cureteam';   ident: SdPokemonIdent }
  | { type: 'boost';      ident: SdPokemonIdent; stat: string; amount: number }
  | { type: 'unboost';    ident: SdPokemonIdent; stat: string; amount: number }
  | { type: 'setboost';   ident: SdPokemonIdent; stat: string; amount: number }
  | { type: 'clearboost'; ident: SdPokemonIdent }
  | { type: 'weather';    weather: string; from?: string }
  | { type: 'fieldstart'; condition: string; from?: string }
  | { type: 'fieldend';   condition: string }
  | { type: 'sidestart';  side: SdSide; condition: string }
  | { type: 'sideend';    side: SdSide; condition: string }
  | { type: 'ability';    ident: SdPokemonIdent; ability: string; from?: string }
  | { type: 'item';       ident: SdPokemonIdent; item: string; from?: string }
  | { type: 'enditem';    ident: SdPokemonIdent; item: string; from?: string }
  | { type: 'transform';  ident: SdPokemonIdent; targetIdent: SdPokemonIdent }
  | { type: 'mega';       ident: SdPokemonIdent; megaStone: string }
  | { type: 'terastallize'; ident: SdPokemonIdent; teraType: string }
  | { type: 'cant';       ident: SdPokemonIdent; reason: string; move?: string }
  | { type: 'fail';       ident: SdPokemonIdent; reason?: string }
  | { type: 'miss';       ident: SdPokemonIdent; targetIdent: SdPokemonIdent | null }
  | { type: 'immune';     ident: SdPokemonIdent; from?: string }
  | { type: 'activate';   ident: SdPokemonIdent | null; condition: string; detail?: string }
  | { type: 'message';    text: string }
  | { type: 'request';    json: SdRequest }
  | { type: 'error';      message: string }
  | { type: 'unknown';    raw: string };

// The |request| JSON object Showdown sends to each player
export interface SdRequest {
  requestType?: 'move' | 'switch' | 'team' | 'wait';
  teamPreview?: boolean;
  wait?: boolean;
  side?: SdSideData;
  active?: SdActiveData[];
  forceSwitch?: boolean[];
  noCancel?: boolean;
}

export interface SdSideData {
  name: string;
  id: SdSide;
  pokemon: SdRequestPokemon[];
}

export interface SdRequestPokemon {
  ident: string;
  details: string;
  condition: string;         // '100/100' or '72/100 par' or '0 fnt'
  active: boolean;
  stats: { atk: number; def: number; spa: number; spd: number; spe: number };
  moves: string[];
  baseAbility: string;
  item: string;
  pokeball: string;
  ability: string;
  teraType?: string;
}

export interface SdActiveData {
  moves: SdMoveData[];
  canMegaEvo?: boolean;
  canUltraBurst?: boolean;
  canDynamax?: boolean;
  canTerastallize?: boolean;
  maxMoves?: { maxMoves: SdMoveData[] };
  zMoves?: (SdMoveData | null)[];
  trapped?: boolean;
  maybeTrapped?: boolean;
}

export interface SdMoveData {
  move: string;
  id: string;
  pp: number;
  maxpp: number;
  target: string;
  disabled: boolean | string;
}
