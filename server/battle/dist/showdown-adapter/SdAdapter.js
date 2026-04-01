import { parseShowdownChunk } from './protocol/parser.js';
import { BattleTranslator } from './translator/BattleTranslator.js';
function encodeMoveChoice(cmd) {
    // Base: "move N" or "move N T" where T is the doubles target slot
    const base = cmd.target !== undefined
        ? `move ${cmd.moveIndex} ${cmd.target}`
        : `move ${cmd.moveIndex}`;
    const modifiers = [];
    if (cmd.mega)
        modifiers.push('mega');
    if (cmd.tera)
        modifiers.push('terastallize');
    if (cmd.dynamax)
        modifiers.push('dynamax');
    return modifiers.length ? `${base} ${modifiers.join(' ')}` : base;
}
/**
 * SdAdapter wraps the @pkmn/sim battle instance and exposes:
 * - start(p1, p2): initializes the battle
 * - command(cmd): routes a player command to Showdown
 * - subscribe(fn): receive BattleViewState snapshots and end events
 *
 * The adapter maintains two translators (one per side) to handle
 * private request data correctly. Spectator state is derived from
 * the public translator (no pendingRequest).
 */
export class SdAdapter {
    _battleId;
    _format;
    _translators;
    _spectatorTranslator;
    _listeners = [];
    _battle = null; // @pkmn/sim Battle instance — typed after install
    constructor(battleId, format = 'gen9ou', effectStyle = 'essentials') {
        this._battleId = battleId;
        this._format = format;
        this._translators = [
            new BattleTranslator(battleId, format, 'p1', effectStyle),
            new BattleTranslator(battleId, format, 'p2', effectStyle),
        ];
        this._spectatorTranslator = new BattleTranslator(battleId, format, null, effectStyle);
    }
    subscribe(fn) {
        this._listeners.push(fn);
        return () => { this._listeners = this._listeners.filter(l => l !== fn); };
    }
    _emit(event) {
        for (const l of this._listeners)
            l(event);
    }
    /**
     * Starts the battle. Requires @pkmn/sim to be installed.
     * Falls back to a clear error if not available.
     */
    async start(p1, p2) {
        try {
            const { Battle } = await import('@pkmn/sim');
            // toID converts a string to Showdown's branded ID type
            const { toID } = await import('@pkmn/sim');
            this._battle = new Battle({
                formatid: toID(this._format),
                send: (type, data) => {
                    this._handleSend(type, data);
                },
            });
            const battle = this._battle;
            // Add players using the Battle API
            this._battle.setPlayer('p1', { name: p1.name, team: p1.team });
            this._battle.setPlayer('p2', { name: p2.name, team: p2.team });
            battle.sendUpdates();
        }
        catch (err) {
            this._emit({ type: 'error', message: `@pkmn/sim not available: ${String(err)}. Run npm install first.` });
        }
    }
    /**
     * Accepts a player command and translates to Showdown /choose format.
     */
    command(cmd) {
        if (!this._battle) {
            this._emit({ type: 'error', message: 'Battle not started' });
            return;
        }
        const side = cmd.playerSlot === 0 ? 'p1' : 'p2';
        let chooseStr;
        switch (cmd.kind) {
            case 'move':
                chooseStr = encodeMoveChoice(cmd);
                break;
            case 'switch':
                chooseStr = `switch ${cmd.partyIndex}`;
                break;
            case 'team':
                // Showdown team preview expects: "team 123456"
                chooseStr = `team ${cmd.order.join('')}`;
                break;
            case 'doubles-choice':
                // Sort by activeSlot so the order matches Showdown's expected slot order
                chooseStr = cmd.choices
                    .slice()
                    .sort((a, b) => a.activeSlot - b.activeSlot)
                    .map(c => c.choice.kind === 'move' ? encodeMoveChoice(c.choice) : `switch ${c.choice.partyIndex}`)
                    .join(', ');
                break;
            default:
                return;
        }
        const battle = this._battle;
        battle.choose(side, chooseStr);
        battle.sendUpdates();
    }
    /**
     * Handles outgoing messages from the Showdown sim.
     * 'update' = public log lines (both sides see this)
     * 'sideupdate' = private data for one side (requests)
     */
    _handleSend(type, data) {
        const raw = Array.isArray(data) ? data.join('\n') : data;
        if (type === 'update') {
            // All three translators get the public stream
            const events = parseShowdownChunk(raw);
            this._translators[0].apply(events);
            this._translators[1].apply(events);
            this._spectatorTranslator.apply(events);
            const snap0 = this._translators[0].snapshot();
            const snap1 = this._translators[1].snapshot();
            const specSnap = this._spectatorTranslator.snapshot();
            this._emit({ type: 'state', playerSlot: 0, state: snap0 });
            this._emit({ type: 'state', playerSlot: 1, state: snap1 });
            this._emit({ type: 'spectator-state', state: specSnap });
            // Check for end
            if (snap0.phase === 'ended') {
                const winner = snap0.winnerName;
                const slot = winner === snap0.sides[0].playerName ? 0 : winner === snap0.sides[1].playerName ? 1 : null;
                this._emit({ type: 'ended', winnerSlot: slot });
            }
        }
        else if (type === 'sideupdate') {
            // Format: "p1\n|request|{...}" or "p2\n|request|{...}"
            const lines = raw.split('\n');
            const sideStr = lines[0];
            const rest = lines.slice(1).join('\n');
            const sideIdx = sideStr === 'p2' ? 1 : 0;
            const events = parseShowdownChunk(rest);
            this._translators[sideIdx].apply(events);
            const snap = this._translators[sideIdx].snapshot();
            this._emit({ type: 'state', playerSlot: sideIdx, state: snap });
        }
    }
}
