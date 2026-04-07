import { Dex } from '@pkmn/dex';
import { parseHpStatus } from '../protocol/parser.js';
const EMPTY_BOOSTS = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 };
// Type → GBA-era flash color. Used in damage-hit cues.
const TYPE_FLASH_COLOR = {
    NORMAL: '#a8a878', FIRE: '#f08030', WATER: '#6890f0', ELECTRIC: '#f8d030',
    GRASS: '#78c850', ICE: '#98d8d8', FIGHTING: '#c03028', POISON: '#a040a0',
    GROUND: '#e0c068', FLYING: '#a890f0', PSYCHIC: '#f85888', BUG: '#a8b820',
    ROCK: '#b8a038', GHOST: '#705898', DRAGON: '#7038f8', DARK: '#705848',
    STEEL: '#b8b8d0', FAIRY: '#ee99ac',
};
const WEATHER_MAP = {
    SunnyDay: 'sun', RainDance: 'rain', Sandstorm: 'sand',
    Hail: 'hail', Snow: 'snow', DesolateLand: 'harshsun',
    PrimordialSea: 'heavyrain', DeltaStream: 'strongwinds', none: null,
};
const TERRAIN_CONDITIONS = new Set(['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain']);
// ─── Move type lookup ─────────────────────────────────────────────────────────
// Uses @pkmn/dex for standard moves. Returns 'NORMAL' for unknown/custom moves.
function getMoveTypeId(moveName) {
    const move = Dex.moves.get(moveName);
    return move.exists ? move.type.toUpperCase() : 'NORMAL';
}
// ─── Slot helpers ─────────────────────────────────────────────────────────────
// 'a' = 0, 'b' = 1, 'c' = 2 — valid for singles and doubles
function slotIndex(slot) {
    return slot === 'b' ? 1 : slot === 'c' ? 2 : 0;
}
function sideIndex(side) {
    return side === 'p1' ? 0 : 1;
}
function makeBlankSide(slot) {
    return { playerSlot: slot, playerId: '', playerName: '', active: [], party: [], sideConditions: [] };
}
function makeBlankField() {
    return { weather: null, weatherTurnsLeft: null, terrain: null, terrainTurnsLeft: null, pseudoWeather: [] };
}
function statusFromStr(s) {
    const map = { psn: 'psn', tox: 'tox', brn: 'brn', par: 'par', slp: 'slp', frz: 'frz' };
    return s ? (map[s] ?? null) : null;
}
function statusVerb(status) {
    const map = { psn: 'poisoned', tox: 'badly poisoned', brn: 'burned', par: 'paralyzed', slp: 'put to sleep', frz: 'frozen' };
    return map[status] ?? status;
}
function parseRequestDetails(details) {
    const [rawName, ...rawParts] = details.split(',').map((part) => part.trim());
    const parts = rawParts.filter(Boolean);
    let level = 100;
    let gender = 'N';
    let shiny = false;
    for (const part of parts) {
        if (part.startsWith('L')) {
            const parsedLevel = Number.parseInt(part.slice(1), 10);
            if (!Number.isNaN(parsedLevel))
                level = parsedLevel;
            continue;
        }
        if (part === 'M' || part === 'F') {
            gender = part;
            continue;
        }
        if (part.toLowerCase() === 'shiny') {
            shiny = true;
        }
    }
    return {
        speciesId: rawName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: rawName,
        level,
        gender,
        shiny,
    };
}
function getRequestKind(req) {
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
    _state;
    _msgSeq = 0;
    _animSeq = 0;
    _playerSide;
    _effectStyle;
    // Tracks the type of the last move used per absolute side+slot key ("0:0", "1:1", etc.)
    // Used to set flashColor on the subsequent damage-hit cue.
    _lastMoveType = new Map();
    constructor(battleId, format, playerSide, effectStyle = 'essentials') {
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
    get state() {
        return this._state;
    }
    /** Returns a full snapshot and drains the animation/message queues. */
    snapshot() {
        const snap = structuredClone(this._state);
        this._state = { ...this._state, messageQueue: [], animationQueue: [] };
        return snap;
    }
    apply(events) {
        for (const event of events) {
            this._applyEvent(event);
        }
    }
    // ─── Event dispatch ────────────────────────────────────────────────────────
    _applyEvent(event) {
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
                    gender: 'N',
                    shiny: false,
                    hpPercent: 100,
                    hpCurrent: null,
                    hpMax: null,
                    hpStatus: 'alive',
                    status: null,
                    item: null,
                    isRevealed: false,
                }));
                break;
            }
            case 'gametype':
                // gametype (singles/doubles/triples) is battlefield shape — never overwrites format (ruleset id)
                s.gametype = event.format;
                break;
            // team preview — phase stays 'preview' until |start|
            case 'teampreview':
                s.phase = 'preview';
                s.pendingRequest = undefined;
                break;
            // |start| fires after team preview choose or directly in non-preview formats
            case 'start':
                s.phase = 'command';
                s.pendingRequest = undefined;
                break;
            case 'turn':
                s.turn = event.turn;
                s.phase = 'command';
                s.pendingRequest = undefined;
                s.animationQueue = [];
                this._pushMsg('info', `Turn ${event.turn}`);
                break;
            case 'win': {
                s.phase = 'ended';
                s.pendingRequest = undefined;
                s.winnerName = event.player;
                // result is relative to this translator's side
                if (this._playerSide === null) {
                    s.result = null; // spectator: no personal result
                }
                else {
                    const myName = s.sides[sideIndex(this._playerSide)].playerName;
                    s.result = event.player === myName ? 'win' : 'loss';
                }
                this._pushMsg('info', `${event.player} won!`);
                break;
            }
            case 'tie':
                s.phase = 'ended';
                s.pendingRequest = undefined;
                s.result = 'tie';
                this._pushMsg('info', 'The battle ended in a tie.');
                break;
            // ─── Pokemon entering field ──────────────────────────────────────────
            case 'switch':
            case 'drag': {
                const sideIdx = sideIndex(event.ident.side);
                const activeSlot = slotIndex(event.ident.slot);
                const hp = this._normalizeHpForViewer(event.ident, parseHpStatus(event.hpStatus));
                const pokemon = {
                    slot: activeSlot,
                    speciesId: event.ident.species.toLowerCase().replace(/[^a-z0-9]/g, ''),
                    name: event.ident.name,
                    level: event.ident.level,
                    gender: event.ident.gender,
                    shiny: event.ident.shiny,
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
                const faintedHp = this._normalizeHpForViewer(event.ident, {
                    hpCurrent: 0,
                    hpMax: 100,
                    percent: 0,
                    status: null,
                    fainted: true,
                });
                if (active) {
                    active.hpCurrent = faintedHp.hpCurrent;
                    active.hpMax = faintedHp.hpMax;
                    active.hpStatus = 'fainted';
                }
                this._updatePartyFromHp(sideIdx, event.ident.name, faintedHp);
                this._pushAnim({ kind: 'faint', side: sideIdx, slot: slotIndex(event.ident.slot) });
                this._pushMsg('faint', `${event.ident.name} fainted!`);
                break;
            }
            // ─── Move ────────────────────────────────────────────────────────────
            case 'move': {
                const sideIdx = sideIndex(event.ident.side);
                s.phase = 'resolving';
                s.pendingRequest = undefined;
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
                const hp = this._normalizeHpForViewer(event.ident, parseHpStatus(event.hpStatus));
                const active = this._findActive(event.ident);
                if (active) {
                    active.hpCurrent = hp.hpCurrent;
                    active.hpMax = hp.hpMax;
                    if (hp.fainted)
                        active.hpStatus = 'fainted';
                }
                this._updatePartyFromHp(sideIdx, event.ident.name, hp);
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
                const hp = this._normalizeHpForViewer(event.ident, parseHpStatus(event.hpStatus));
                const active = this._findActive(event.ident);
                if (active) {
                    active.hpCurrent = hp.hpCurrent;
                    active.hpMax = hp.hpMax;
                }
                this._updatePartyFromHp(sideIdx, event.ident.name, hp);
                this._pushMsg('heal', `${event.ident.name} regained health!`);
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
                const hp = this._normalizeHpForViewer(event.ident, parseHpStatus(event.hpStatus));
                const active = this._findActive(event.ident);
                if (active) {
                    active.hpCurrent = hp.hpCurrent;
                    active.hpMax = hp.hpMax;
                }
                break;
            }
            // ─── Status conditions ────────────────────────────────────────────────
            case 'status': {
                const active = this._findActive(event.ident);
                if (active)
                    active.status = statusFromStr(event.status);
                this._updatePartyStatus(sideIndex(event.ident.side), event.ident.name, statusFromStr(event.status));
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
                if (active)
                    active.status = null;
                this._updatePartyStatus(sideIndex(event.ident.side), event.ident.name, null);
                this._pushMsg('info', `${event.ident.name} was cured of its ${event.status}!`);
                break;
            }
            case 'cureteam': {
                const sideIdx = sideIndex(event.ident.side);
                for (const a of s.sides[sideIdx].active)
                    a.status = null;
                for (const p of s.sides[sideIdx].party)
                    p.status = null;
                break;
            }
            // ─── Stat boosts ──────────────────────────────────────────────────────
            case 'boost':
            case 'unboost':
            case 'setboost': {
                const active = this._findActive(event.ident);
                if (active) {
                    const stat = event.stat;
                    if (stat in active.boosts) {
                        if (event.type === 'setboost') {
                            active.boosts[stat] = event.amount;
                        }
                        else {
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
                if (active)
                    active.boosts = { ...EMPTY_BOOSTS };
                break;
            }
            // ─── Field ────────────────────────────────────────────────────────────
            case 'weather': {
                s.field.weather = WEATHER_MAP[event.weather] ?? null;
                this._pushAnim({ kind: 'weather-change', weather: s.field.weather });
                if (event.weather !== 'none')
                    this._pushMsg('weather', `The weather changed to ${event.weather}.`);
                break;
            }
            case 'fieldstart': {
                const cond = event.condition.toLowerCase().replace(/\s/g, '');
                if (TERRAIN_CONDITIONS.has(cond)) {
                    s.field.terrain = cond.replace('terrain', '');
                    this._pushAnim({ kind: 'terrain-change', terrain: s.field.terrain });
                }
                else {
                    if (!s.field.pseudoWeather.includes(cond))
                        s.field.pseudoWeather.push(cond);
                }
                this._pushMsg('info', `${event.condition} started!`);
                break;
            }
            case 'fieldend': {
                const cond = event.condition.toLowerCase().replace(/\s/g, '');
                if (TERRAIN_CONDITIONS.has(cond)) {
                    s.field.terrain = null;
                }
                else {
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
                if (active)
                    active.ability = event.ability;
                break;
            }
            case 'item': {
                const active = this._findActive(event.ident);
                if (active)
                    active.item = event.item;
                break;
            }
            case 'enditem': {
                const active = this._findActive(event.ident);
                if (active)
                    active.item = null;
                break;
            }
            case 'terastallize': {
                const active = this._findActive(event.ident);
                if (active) {
                    active.teraType = event.teraType;
                    active.isTerastallized = true;
                }
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
    _findActive(ident) {
        const sideIdx = sideIndex(ident.side);
        const slotIdx = slotIndex(ident.slot);
        const bySlot = this._state.sides[sideIdx].active[slotIdx];
        if (bySlot && bySlot.name === ident.name)
            return bySlot;
        // fallback: linear scan by name (covers events with no slot info)
        return this._state.sides[sideIdx].active.find(a => a.name === ident.name);
    }
    _revealInParty(sideIdx, name, hp) {
        const party = this._state.sides[sideIdx].party;
        const existing = party.find(p => p.name === name);
        const slot = existing ?? party.find(p => !p.isRevealed);
        if (slot) {
            slot.name = name;
            slot.hpPercent = hp.percent;
            slot.hpCurrent = hp.hpCurrent;
            slot.hpMax = hp.hpMax;
            slot.hpStatus = hp.fainted ? 'fainted' : 'alive';
            slot.isRevealed = true;
        }
    }
    _updatePartyFromHp(sideIdx, name, hp) {
        const slot = this._state.sides[sideIdx].party.find(p => p.name === name);
        if (slot) {
            slot.hpPercent = hp.percent;
            slot.hpCurrent = hp.hpCurrent;
            slot.hpMax = hp.hpMax;
            slot.hpStatus = hp.fainted ? 'fainted' : 'alive';
            slot.status = statusFromStr(hp.status);
        }
    }
    _updatePartyStatus(sideIdx, name, status) {
        const slot = this._state.sides[sideIdx].party.find(p => p.name === name);
        if (slot) {
            slot.status = status;
        }
    }
    _knownHpState(sideIdx, name) {
        const active = this._state.sides[sideIdx].active.find((pokemon) => pokemon.name === name && pokemon.hpMax > 0);
        if (active) {
            return {
                hpCurrent: active.hpCurrent,
                hpMax: active.hpMax,
            };
        }
        const partySlot = this._state.sides[sideIdx].party.find((pokemon) => pokemon.name === name &&
            pokemon.hpCurrent !== null &&
            pokemon.hpMax !== null &&
            pokemon.hpMax > 0);
        if (!partySlot || partySlot.hpCurrent === null || partySlot.hpMax === null) {
            return null;
        }
        return {
            hpCurrent: partySlot.hpCurrent,
            hpMax: partySlot.hpMax,
        };
    }
    _normalizeHpForPlayerSide(side, name, hp) {
        if (this._playerSide === null || side !== this._playerSide) {
            return hp;
        }
        const known = this._knownHpState(sideIndex(side), name);
        if (!known || known.hpMax <= 0) {
            return hp;
        }
        if (hp.hpMax !== 100 && hp.hpMax !== known.hpMax) {
            return hp;
        }
        const hpCurrent = hp.fainted
            ? 0
            : Math.max(0, Math.min(known.hpMax, Math.round((hp.percent / 100) * known.hpMax)));
        return {
            ...hp,
            hpCurrent,
            hpMax: known.hpMax,
            percent: known.hpMax > 0 ? Math.round((hpCurrent / known.hpMax) * 100) : 0,
        };
    }
    _normalizeHpForViewer(ident, hp) {
        return this._normalizeHpForPlayerSide(ident.side, ident.name, hp);
    }
    _syncPartyFromRequest(side, req) {
        const sideData = req.side;
        if (!sideData?.pokemon?.length)
            return;
        const sideIdx = sideIndex(side);
        const nextParty = sideData.pokemon.map((pokemon, index) => {
            const details = parseRequestDetails(pokemon.details);
            const hp = this._normalizeHpForPlayerSide(side, details.name, parseHpStatus(pokemon.condition));
            return {
                position: index,
                speciesId: details.speciesId,
                name: details.name,
                level: details.level,
                gender: details.gender,
                shiny: details.shiny,
                hpPercent: hp.percent,
                hpCurrent: hp.hpCurrent,
                hpMax: hp.hpMax,
                hpStatus: hp.fainted ? 'fainted' : 'alive',
                status: statusFromStr(hp.status),
                item: pokemon.item || null,
                isRevealed: true,
            };
        });
        this._state.sides[sideIdx].party = nextParty;
        const activeParty = sideData.pokemon.filter((pokemon) => pokemon.active);
        activeParty.forEach((pokemon, activeSlot) => {
            const active = this._state.sides[sideIdx].active[activeSlot];
            if (!active)
                return;
            const hp = parseHpStatus(pokemon.condition);
            const details = parseRequestDetails(pokemon.details);
            active.speciesId = details.speciesId;
            active.name = details.name;
            active.level = details.level;
            active.gender = details.gender;
            active.shiny = details.shiny;
            active.hpCurrent = hp.hpCurrent;
            active.hpMax = hp.hpMax;
            active.hpStatus = hp.fainted ? 'fainted' : 'alive';
            active.status = statusFromStr(hp.status);
            active.item = pokemon.item || null;
            active.ability = pokemon.ability || pokemon.baseAbility || null;
            active.isRevealed = true;
            active.teraType = pokemon.teraType ?? active.teraType;
        });
    }
    _translateRequest(req, side) {
        this._syncPartyFromRequest(side, req);
        const requestKind = getRequestKind(req);
        const sideData = req.side;
        // ── Per-slot move/forceSwitch data (one entry per active pokemon) ─────────
        const slots = (req.active ?? []).map((active, slotIdx) => ({
            slot: slotIdx,
            moves: active.moves.map((m, i) => ({
                index: i + 1,
                id: m.id,
                name: m.move,
                typeId: getMoveTypeId(m.id),
                target: m.target,
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
        if (requestKind === 'switch' && slots.length === 0) {
            const forcedSlots = req.forceSwitch
                ?.map((needsSwitch, slotIdx) => (needsSwitch ? slotIdx : -1))
                .filter((slotIdx) => slotIdx >= 0) ?? [];
            const fallbackCount = sideData?.pokemon.filter((pokemon) => pokemon.active).length ?? 0;
            const slotIndexes = forcedSlots.length > 0
                ? forcedSlots
                : Array.from({ length: Math.max(1, fallbackCount) }, (_, slotIdx) => slotIdx);
            slotIndexes.forEach((slotIdx) => {
                slots.push({
                    slot: slotIdx,
                    moves: [],
                    forceSwitch: true,
                    trapped: false,
                });
            });
        }
        // ── Switch pool — preserve original 1-based team position ─────────────────
        // Map with original index BEFORE filtering so position stays accurate.
        // Showdown /choose switch N uses this original position directly.
        const allParty = (sideData?.pokemon ?? []).map((p, i) => {
            const hp = parseHpStatus(p.condition);
            return {
                position: i + 1, // original, never remapped
                speciesId: p.details.split(',')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
                name: p.details.split(',')[0],
                hpPercent: hp.percent,
                hpStatus: hp.fainted ? 'fainted' : 'alive',
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
    _pushMsg(kind, text) {
        this._state.messageQueue.push({ id: String(this._msgSeq++), kind, text });
    }
    _pushAnim(cue) {
        this._state.animationQueue.push({ seq: this._animSeq++, ...cue });
    }
}
