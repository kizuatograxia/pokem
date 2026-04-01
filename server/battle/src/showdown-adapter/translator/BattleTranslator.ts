import { Dex } from '@pkmn/dex';
import type { SdEvent, SdPokemonIdent, SdRequest, SdSide } from '../protocol/types.js';
import { parseHpStatus } from '../protocol/parser.js';
import type {
  BattleViewState,
  BattleSideView,
  ActivePokemonView,
  FieldView,
  BattleMessage,
  BattleAnimationCue,
  BattleAnimationCueData,
  PlayerRequestView,
  SlotRequest,
  StatBoosts,
  StatusCondition,
  WeatherState,
  TerrainState,
  GameType,
  EffectStyle,
} from '../../view-model/types.js';

const EMPTY_BOOSTS: StatBoosts = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };

// Type → GBA-era flash color. Used in damage-hit cues.
const TYPE_FLASH_COLOR: Record<string, string> = {
  NORMAL: '#a8a878', FIRE: '#f08030', WATER: '#6890f0', ELECTRIC: '#f8d030',
  GRASS: '#78c850', ICE: '#98d8d8', FIGHTING: '#c03028', POISON: '#a040a0',
  GROUND: '#e0c068', FLYING: '#a890f0', PSYCHIC: '#f85888', BUG: '#a8b820',
  ROCK: '#b8a038', GHOST: '#705898', DRAGON: '#7038f8', DARK: '#705848',
  STEEL: '#b8b8d0', FAIRY: '#ee99ac',
};

const WEATHER_MAP: Record<string, WeatherState> = {
  SunnyDay: 'sun', RainDance: 'rain', Sandstorm: 'sand',
  Hail: 'hail', Snow: 'snow', DesolateLand: 'harshsun',
  PrimordialSea: 'heavyrain', DeltaStream: 'strongwinds', none: null,
};

const TERRAIN_CONDITIONS = new Set(['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain']);

// ─── Move type lookup ─────────────────────────────────────────────────────────
// Uses @pkmn/dex for standard moves. Returns 'NORMAL' for unknown/custom moves.

function getMoveTypeId(moveName: string): string {
  const move = Dex.moves.get(moveName);
  return move.exists ? move.type.toUpperCase() : 'NORMAL';
}

// ─── Slot helpers ─────────────────────────────────────────────────────────────
// 'a' = 0, 'b' = 1, 'c' = 2 — valid for singles and doubles

function slotIndex(slot: string): number {
  return slot === 'b' ? 1 : slot === 'c' ? 2 : 0;
}

function sideIndex(side: SdSide): 0 | 1 {
  return side === 'p1' ? 0 : 1;
}

function makeBlankSide(slot: 0 | 1): BattleSideView {
  return { playerSlot: slot, playerId: '', playerName: '', active: [], party: [], sideConditions: [] };
}

function makeBlankField(): FieldView {
  return { weather: null, weatherTurnsLeft: null, terrain: null, terrainTurnsLeft: null, pseudoWeather: [] };
}

function statusFromStr(s: string | null): StatusCondition {
  const map: Record<string, StatusCondition> = { psn: 'psn', tox: 'tox', brn: 'brn', par: 'par', slp: 'slp', frz: 'frz' };
  return s ? (map[s] ?? null) : null;
}

function statusVerb(status: string): string {
  const map: Record<string, string> = { psn: 'poisoned', tox: 'badly poisoned', brn: 'burned', par: 'paralyzed', slp: 'put to sleep', frz: 'frozen' };
  return map[status] ?? status;
}

function getRequestKind(req: SdRequest): PlayerRequestView['kind'] {
  if (req.requestType) {
    return req.requestType;
  }

  if (req.wait) {
    return 'wait';
  }

  if (req.teamPreview) {
    return 'team';
  }

  if (req.forceSwitch?.some(Boolean)) {
    return 'switch';
  }

  if (req.active?.length) {
    return 'move';
  }

  return 'wait';
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stateful translator: processes a stream of SdEvents and maintains a BattleViewState.
 *
 * @param playerSide - which Showdown side ('p1'|'p2') this translator represents.
 *   Determines result relativity (win vs loss) and which pendingRequest is injected.
 *   Pass null for spectator translators.
 */
export class BattleTranslator {
  private _state: BattleViewState;
  private _msgSeq = 0;
  private _animSeq = 0;
  private _playerSide: SdSide | null;
  private _effectStyle: EffectStyle;
  // Tracks the type of the last move used per absolute side+slot key ("0:0", "1:1", etc.)
  // Used to set flashColor on the subsequent damage-hit cue.
  private _lastMoveType = new Map<string, string>();

  constructor(battleId: string, format: string, playerSide: SdSide | null, effectStyle: EffectStyle = 'essentials') {
    this._playerSide = playerSide;
    this._effectStyle = effectStyle;
    this._state = {
      battleId,
      turn: 0,
      phase: 'preview',
      format,
      gametype: 'singles',
      spriteStyle: 'retro',
      effectStyle,
      sides: [makeBlankSide(0), makeBlankSide(1)],
      field: makeBlankField(),
      messageQueue: [],
      animationQueue: [],
      result: null,
      winnerName: null,
    };
  }

  get state(): Readonly<BattleViewState> {
    return this._state;
  }

  /** Returns a full snapshot and drains the animation/message queues. */
  snapshot(): BattleViewState {
    const snap = structuredClone(this._state) as BattleViewState;
    this._state = { ...this._state, messageQueue: [], animationQueue: [] };
    return snap;
  }

  apply(events: SdEvent[]): void {
    for (const event of events) {
      this._applyEvent(event);
    }
  }

  // ─── Event dispatch ────────────────────────────────────────────────────────

  private _applyEvent(event: SdEvent): void {
    const s = this._state;

    switch (event.type) {

      case 'player': {
        const idx = sideIndex(event.side);
        s.sides[idx].playerId = event.side;
        s.sides[idx].playerName = event.name;
        break;
      }

      case 'teamsize': {
        const idx = sideIndex(event.side);
        s.sides[idx].party = Array.from({ length: event.size }, (_, i) => ({
          position: i,
          speciesId: '???',
          name: '???',
          level: 100,
          gender: 'N' as const,
          hpPercent: 100,
          hpStatus: 'alive' as const,
          status: null,
          isRevealed: false,
        }));
        break;
      }

      case 'gametype':
        // gametype (singles/doubles/triples) is battlefield shape — never overwrites format (ruleset id)
        s.gametype = event.format as GameType;
        break;

      // team preview — phase stays 'preview' until |start|
      case 'teampreview':
        s.phase = 'preview';
        break;

      // |start| fires after team preview choose or directly in non-preview formats
      case 'start':
        s.phase = 'command';
        break;

      case 'turn':
        s.turn = event.turn;
        s.phase = 'command';
        s.animationQueue = [];
        this._pushMsg('info', `Turn ${event.turn}`);
        break;

      case 'win': {
        s.phase = 'ended';
        s.winnerName = event.player;
        // result is relative to this translator's side
        if (this._playerSide === null) {
          s.result = null; // spectator: no personal result
        } else {
          const myName = s.sides[sideIndex(this._playerSide)].playerName;
          s.result = event.player === myName ? 'win' : 'loss';
        }
        this._pushMsg('info', `${event.player} won!`);
        break;
      }

      case 'tie':
        s.phase = 'ended';
        s.result = 'tie';
        this._pushMsg('info', 'The battle ended in a tie.');
        break;

      // ─── Pokemon entering field ──────────────────────────────────────────

      case 'switch':
      case 'drag': {
        const sideIdx = sideIndex(event.ident.side);
        const activeSlot = slotIndex(event.ident.slot);
        const hp = parseHpStatus(event.hpStatus);

        const pokemon: ActivePokemonView = {
          slot: activeSlot,
          speciesId: event.ident.species.toLowerCase().replace(/[^a-z0-9]/g, ''),
          name: event.ident.name,
          level: event.ident.level,
          gender: event.ident.gender,
          hpCurrent: hp.hpCurrent,
          hpMax: hp.hpMax,
          hpStatus: hp.fainted ? 'fainted' : 'alive',
          status: statusFromStr(hp.status),
          volatiles: [],
          boosts: { ...EMPTY_BOOSTS },
          item: null,
          ability: null,
          moves: [],
          isRevealed: true,
          teraType: null,
          isTerastallized: false,
        };

        // Place at the correct slot index, preserving other active slots (doubles)
        s.sides[sideIdx].active[activeSlot] = pokemon;
        this._revealInParty(sideIdx, event.ident.name, hp);
        this._pushAnim({
          kind: 'switch-in',
          side: sideIdx,
          slot: activeSlot,
          spriteId: pokemon.speciesId,
          // side is absolute (0=p1, 1=p2). p1 enters from below; p2 enters from right.
          // Renderer maps to "my side / opponent" via its own viewerSide.
          entryFrom: sideIdx === 0 ? 'below' : 'right',
        });
        this._pushMsg('switch', `${s.sides[sideIdx].playerName} sent out ${pokemon.name}!`);
        break;
      }

      case 'faint': {
        const sideIdx = sideIndex(event.ident.side);
        const active = this._findActive(event.ident);
        if (active) active.hpStatus = 'fainted';
        this._updatePartyHp(sideIdx, event.ident.name, 0, true);
        this._pushAnim({ kind: 'faint', side: sideIdx, slot: slotIndex(event.ident.slot) });
        this._pushMsg('faint', `${event.ident.name} fainted!`);
        break;
      }

      // ─── Move ────────────────────────────────────────────────────────────

      case 'move': {
        const sideIdx = sideIndex(event.ident.side);
        s.phase = 'resolving';
        const activeSlotIdx = slotIndex(event.ident.slot);
        const typeId = getMoveTypeId(event.moveName);
        this._lastMoveType.set(`${sideIdx}:${activeSlotIdx}`, typeId);
        this._pushAnim({
          kind: 'move-use',
          side: sideIdx,
          slot: activeSlotIdx,
          moveId: event.moveName.toUpperCase().replace(/\s/g, ''),
          typeId,
        });
        this._pushMsg('move', `${event.ident.name} used ${event.moveName}!${event.missed ? ' But it missed!' : ''}`);
        break;
      }

      // ─── HP changes ───────────────────────────────────────────────────────

      case 'damage': {
        const sideIdx = sideIndex(event.ident.side);
        const hp = parseHpStatus(event.hpStatus);
        const active = this._findActive(event.ident);
        if (active) {
          active.hpCurrent = hp.hpCurrent;
          active.hpMax = hp.hpMax;
          if (hp.fainted) active.hpStatus = 'fainted';
        }
        this._updatePartyHp(sideIdx, event.ident.name, hp.percent, hp.fainted);
        const dmgSlot = slotIndex(event.ident.slot);
        // Damage lands on the target's side, but the move was used by the other side.
        // We look up the last known move type from the attacker (either side, any slot).
        const lastType = this._lastMoveType.get(`${sideIdx === 0 ? 1 : 0}:0`)
          ?? this._lastMoveType.get(`${sideIdx === 0 ? 1 : 0}:1`)
          ?? 'NORMAL';
        this._pushAnim({
          kind: 'damage-hit',
          side: sideIdx,
          slot: dmgSlot,
          hpPercentAfter: hp.percent,
          flashColor: TYPE_FLASH_COLOR[lastType] ?? '#ffffff',
          from: event.from,
        });
        break;
      }

      case 'heal': {
        const sideIdx = sideIndex(event.ident.side);
        const hp = parseHpStatus(event.hpStatus);
        const active = this._findActive(event.ident);
        if (active) { active.hpCurrent = hp.hpCurrent; active.hpMax = hp.hpMax; }
        this._updatePartyHp(sideIdx, event.ident.name, hp.percent, false);
        this._pushAnim({
          kind: 'heal',
          side: sideIdx,
          slot: slotIndex(event.ident.slot),
          hpPercentAfter: hp.percent,
          from: event.from,
        });
        break;
      }

      case 'sethp': {
        const hp = parseHpStatus(event.hpStatus);
        const active = this._findActive(event.ident);
        if (active) { active.hpCurrent = hp.hpCurrent; active.hpMax = hp.hpMax; }
        break;
      }

      // ─── Status conditions ────────────────────────────────────────────────

      case 'status': {
        const active = this._findActive(event.ident);
        if (active) active.status = statusFromStr(event.status);
        this._pushAnim({
          kind: 'status-apply',
          side: sideIndex(event.ident.side),
          slot: slotIndex(event.ident.slot),
          status: statusFromStr(event.status),
        });
        this._pushMsg('status', `${event.ident.name} was ${statusVerb(event.status)}!`);
        break;
      }

      case 'curestatus': {
        const active = this._findActive(event.ident);
        if (active) active.status = null;
        this._pushMsg('info', `${event.ident.name} was cured of its ${event.status}!`);
        break;
      }

      case 'cureteam': {
        const sideIdx = sideIndex(event.ident.side);
        for (const a of s.sides[sideIdx].active) a.status = null;
        for (const p of s.sides[sideIdx].party) p.status = null;
        break;
      }

      // ─── Stat boosts ──────────────────────────────────────────────────────

      case 'boost':
      case 'unboost':
      case 'setboost': {
        const active = this._findActive(event.ident);
        if (active) {
          const stat = event.stat as keyof StatBoosts;
          if (stat in active.boosts) {
            if (event.type === 'setboost') {
              active.boosts[stat] = event.amount;
            } else {
              const delta = event.type === 'boost' ? event.amount : -event.amount;
              active.boosts[stat] = Math.max(-6, Math.min(6, active.boosts[stat] + delta));
            }
          }
        }
        const dir = event.type === 'unboost' ? 'fell' : 'rose';
        this._pushAnim({
          kind: 'boost',
          side: sideIndex(event.ident.side),
          slot: slotIndex(event.ident.slot),
          stat: event.stat,
          dir,
        });
        this._pushMsg('boost', `${event.ident.name}'s ${event.stat} ${dir}!`);
        break;
      }

      case 'clearboost': {
        const active = this._findActive(event.ident);
        if (active) active.boosts = { ...EMPTY_BOOSTS };
        break;
      }

      // ─── Field ────────────────────────────────────────────────────────────

      case 'weather': {
        s.field.weather = WEATHER_MAP[event.weather] ?? null;
        this._pushAnim({ kind: 'weather-change', weather: s.field.weather });
        if (event.weather !== 'none') this._pushMsg('weather', `The weather changed to ${event.weather}.`);
        break;
      }

      case 'fieldstart': {
        const cond = event.condition.toLowerCase().replace(/\s/g, '');
        if (TERRAIN_CONDITIONS.has(cond)) {
          s.field.terrain = cond.replace('terrain', '') as TerrainState;
          this._pushAnim({ kind: 'terrain-change', terrain: s.field.terrain });
        } else {
          if (!s.field.pseudoWeather.includes(cond)) s.field.pseudoWeather.push(cond);
        }
        this._pushMsg('info', `${event.condition} started!`);
        break;
      }

      case 'fieldend': {
        const cond = event.condition.toLowerCase().replace(/\s/g, '');
        if (TERRAIN_CONDITIONS.has(cond)) {
          s.field.terrain = null;
        } else {
          s.field.pseudoWeather = s.field.pseudoWeather.filter(c => c !== cond);
        }
        break;
      }

      case 'sidestart': {
        const idx = sideIndex(event.side);
        if (!s.sides[idx].sideConditions.includes(event.condition)) {
          s.sides[idx].sideConditions.push(event.condition);
        }
        break;
      }

      case 'sideend': {
        const idx = sideIndex(event.side);
        s.sides[idx].sideConditions = s.sides[idx].sideConditions.filter(c => c !== event.condition);
        break;
      }

      // ─── Reveals ──────────────────────────────────────────────────────────

      case 'ability': {
        const active = this._findActive(event.ident);
        if (active) active.ability = event.ability;
        break;
      }

      case 'item': {
        const active = this._findActive(event.ident);
        if (active) active.item = event.item;
        break;
      }

      case 'enditem': {
        const active = this._findActive(event.ident);
        if (active) active.item = null;
        break;
      }

      case 'terastallize': {
        const active = this._findActive(event.ident);
        if (active) { active.teraType = event.teraType; active.isTerastallized = true; }
        break;
      }

      // ─── Misc ─────────────────────────────────────────────────────────────

      case 'cant':
        this._pushMsg('info', `${event.ident.name} can't use ${event.move ?? 'a move'} (${event.reason}).`);
        break;

      case 'immune':
        this._pushMsg('info', `It doesn't affect ${event.ident.name}...`);
        break;

      case 'message':
        this._pushMsg('info', event.text);
        break;

      case 'request':
        // Only inject pendingRequest for this translator's own side
        if (this._playerSide !== null) {
          s.pendingRequest = this._translateRequest(event.json, this._playerSide);
        }
        break;

      case 'error':
        this._pushMsg('error', event.message);
        break;
    }
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  /**
   * Find an active pokemon by slot first, then fall back to name.
   * Slot lookup is O(1) and correct for doubles; name fallback handles
   * cases where the ident slot is ambiguous (e.g. some legacy events).
   */
  private _findActive(ident: SdPokemonIdent): ActivePokemonView | undefined {
    const sideIdx = sideIndex(ident.side);
    const slotIdx = slotIndex(ident.slot);
    const bySlot = this._state.sides[sideIdx].active[slotIdx];
    if (bySlot && bySlot.name === ident.name) return bySlot;
    // fallback: linear scan by name (covers events with no slot info)
    return this._state.sides[sideIdx].active.find(a => a.name === ident.name);
  }

  private _revealInParty(sideIdx: number, name: string, hp: ReturnType<typeof parseHpStatus>) {
    const party = this._state.sides[sideIdx].party;
    const existing = party.find(p => p.name === name);
    const slot = existing ?? party.find(p => !p.isRevealed);
    if (slot) {
      slot.name = name;
      slot.hpPercent = hp.percent;
      slot.hpStatus = hp.fainted ? 'fainted' : 'alive';
      slot.isRevealed = true;
    }
  }

  private _updatePartyHp(sideIdx: number, name: string, percent: number, fainted: boolean) {
    const slot = this._state.sides[sideIdx].party.find(p => p.name === name);
    if (slot) {
      slot.hpPercent = percent;
      slot.hpStatus = fainted ? 'fainted' : 'alive';
    }
  }

  private _translateRequest(req: SdRequest, _side: SdSide): PlayerRequestView {
    const requestKind = getRequestKind(req);
    const sideData = req.side;

    // ── Per-slot move/forceSwitch data (one entry per active pokemon) ─────────
    const slots: SlotRequest[] = (req.active ?? []).map((active, slotIdx) => ({
      slot: slotIdx,
      moves: active.moves.map((m, i) => ({
        index: i + 1,
        id: m.id,
        name: m.move,
        pp: m.pp,
        maxPp: m.maxpp,
        disabled: !!m.disabled,
        canMegaEvo: !!active.canMegaEvo,
        canTerastallize: !!active.canTerastallize,
        canDynamax: !!active.canDynamax,
      })),
      forceSwitch: !!(req.forceSwitch?.[slotIdx]),
      trapped: !!(active.trapped),
    }));

    // ── Switch pool — preserve original 1-based team position ─────────────────
    // Map with original index BEFORE filtering so position stays accurate.
    // Showdown /choose switch N uses this original position directly.
    const allParty = (sideData?.pokemon ?? []).map((p, i) => {
      const hp = parseHpStatus(p.condition);
      return {
        position: i + 1,                                              // original, never remapped
        speciesId: p.details.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: p.details.split(',')[0],
        hpPercent: hp.percent,
        hpStatus: hp.fainted ? 'fainted' as const : 'alive' as const,
        status: statusFromStr(hp.status),
        _active: p.active,
        _fainted: hp.fainted,
      };
    });

    // For team preview: expose all slots (player will order them).
    // For move/switch: expose only non-active, non-fainted bench members.
    const switches = requestKind === 'team'
      ? allParty.map(({ _active: _a, _fainted: _f, ...rest }) => rest)
      : allParty
          .filter(p => !p._active && !p._fainted)
          .map(({ _active: _a, _fainted: _f, ...rest }) => rest);

    return {
      kind: requestKind,
      slots,
      switches,
      noCancel: !!req.noCancel,
    };
  }

  private _pushMsg(kind: BattleMessage['kind'], text: string) {
    this._state.messageQueue.push({ id: String(this._msgSeq++), kind, text });
  }

  private _pushAnim(cue: BattleAnimationCueData) {
    this._state.animationQueue.push({ seq: this._animSeq++, ...cue } as BattleAnimationCue);
  }
}
