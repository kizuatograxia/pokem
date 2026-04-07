import { parseShowdownChunk } from "./protocol/parser.js";
import { BattleTranslator } from "./translator/BattleTranslator.js";
import { createBattleBagState, findBattleBagItem, toBattleBagView, } from "./battleBag.js";
function moveChoiceEvent(cmd) {
    if (cmd.mega)
        return "mega";
    if (cmd.tera)
        return "terastallize";
    if (cmd.dynamax)
        return "dynamax";
    return "";
}
function articleFor(name) {
    return /^[aeiou]/i.test(name) ? "an" : "a";
}
function itemEffect(item) {
    return {
        id: item.id.toLowerCase(),
        name: item.name,
        fullname: `item: ${item.name}`,
    };
}
function hpStatusText(pokemon) {
    const base = `${pokemon.hp}/${pokemon.maxhp}`;
    return pokemon.status ? `${base} ${pokemon.status}` : base;
}
function playerSlotFromSide(side) {
    return side.id === "p2" ? 1 : 0;
}
function targetPokemonForItem(source, item, targetPartyIndex) {
    if (item.useType === "no-target") {
        return source;
    }
    if (targetPartyIndex === undefined) {
        return null;
    }
    const target = source.side.pokemon[targetPartyIndex] ?? null;
    if (!target) {
        return null;
    }
    if (item.useType === "battler" && !source.side.active.includes(target)) {
        return null;
    }
    return target;
}
function canUseTrainerItemNow(source, item, target) {
    switch (item.id) {
        case "POTION":
        case "SUPERPOTION":
        case "HYPERPOTION":
        case "SITRUSBERRY":
            return !!target && target.hp > 0 && !target.fainted && target.hp < target.maxhp;
        case "FULLHEAL":
        case "LUMBERRY":
            return !!target && target.hp > 0 && !target.fainted && (!!target.status || !!target.volatiles["confusion"]);
        case "FULLRESTORE":
            return (!!target &&
                target.hp > 0 &&
                !target.fainted &&
                (target.hp < target.maxhp || !!target.status || !!target.volatiles["confusion"]));
        case "DIREHIT":
            return !!target && target.hp > 0 && !target.fainted && !target.volatiles["focusenergy"];
        case "GUARDSPEC":
            return !source.side.sideConditions["mist"];
        default:
            return false;
    }
}
function selectionErrorText(source, item, targetPartyIndex) {
    if (item.useType === "field") {
        return "This isn't the time to use that.";
    }
    if (item.useType === "ball") {
        return "You can't throw a Poke Ball!";
    }
    const target = targetPokemonForItem(source, item, targetPartyIndex);
    if (!canUseTrainerItemNow(source, item, target)) {
        return "It won't have any effect.";
    }
    return "";
}
export class SdAdapter {
    _battleId;
    _format;
    _translators;
    _spectatorTranslator;
    _listeners = [];
    _battle = null;
    _bags = [
        createBattleBagState(),
        createBattleBagState(),
    ];
    constructor(battleId, format = "gen9ou", effectStyle = "essentials") {
        this._battleId = battleId;
        this._format = format;
        this._translators = [
            new BattleTranslator(battleId, format, "p1", effectStyle),
            new BattleTranslator(battleId, format, "p2", effectStyle),
        ];
        this._spectatorTranslator = new BattleTranslator(battleId, format, null, effectStyle);
    }
    subscribe(fn) {
        this._listeners.push(fn);
        return () => {
            this._listeners = this._listeners.filter((listener) => listener !== fn);
        };
    }
    _emit(event) {
        for (const listener of this._listeners)
            listener(event);
    }
    async start(p1, p2) {
        try {
            const { Battle } = await import("@pkmn/sim");
            const { toID } = await import("@pkmn/sim");
            this._bags = [createBattleBagState(), createBattleBagState()];
            this._battle = new Battle({
                formatid: toID(this._format),
                send: (type, data) => {
                    this._handleSend(type, data);
                },
            });
            this._installTrainerItemHandler(this._battle);
            this._battle.setPlayer("p1", { name: p1.name, team: p1.team });
            this._battle.setPlayer("p2", { name: p2.name, team: p2.team });
            this._battle.sendUpdates();
        }
        catch (error) {
            this._emit({
                type: "error",
                message: `@pkmn/sim not available: ${String(error)}. Run npm install first.`,
            });
        }
    }
    command(cmd) {
        if (!this._battle) {
            this._emit({ type: "error", message: "Battle not started" });
            return;
        }
        const sideId = cmd.playerSlot === 0 ? "p1" : "p2";
        const side = this._battle.getSide(sideId);
        let success = false;
        if (cmd.kind === "team") {
            success = side.chooseTeam(cmd.order.join(""));
        }
        else {
            side.clearChoice();
            const slotChoices = cmd.kind === "multi-choice"
                ? cmd.choices.slice().sort((left, right) => left.activeSlot - right.activeSlot)
                : [{ activeSlot: cmd.activeSlot, choice: cmd }];
            success = slotChoices.every((slotChoice) => this._applySlotChoice(side, slotChoice));
            if (success && !side.isChoiceDone()) {
                if (!side.choice.error) {
                    side.emitChoiceError("Incomplete choice - missing other Pokemon.");
                }
                success = false;
            }
        }
        if (success && this._battle.allChoicesDone()) {
            this._battle.commitChoices();
        }
        this._battle.sendUpdates();
    }
    _applySlotChoice(side, slotChoice) {
        const { choice } = slotChoice;
        switch (choice.kind) {
            case "move":
                return side.chooseMove(String(choice.moveIndex), choice.target ?? 0, moveChoiceEvent(choice));
            case "switch":
                return side.chooseSwitch(String(choice.partyIndex));
            case "shift":
                return side.chooseShift();
            case "item":
                return this._chooseTrainerItem(side, choice);
            default:
                return false;
        }
    }
    _chooseTrainerItem(side, cmd) {
        if (side.requestState !== "move") {
            return side.emitChoiceError(`Can't use item: You need a ${side.requestState} response.`);
        }
        const choiceIndex = side.getChoiceIndex();
        if (choiceIndex >= side.active.length) {
            return side.emitChoiceError("Can't use item: You sent more choices than unfainted Pokemon.");
        }
        const pokemon = side.active[choiceIndex];
        if (!pokemon) {
            return side.emitChoiceError("Can't use item: There is no active Pokemon in that slot.");
        }
        const playerSlot = playerSlotFromSide(side);
        const bagState = this._bags[playerSlot];
        const found = findBattleBagItem(bagState, cmd.itemId);
        if (!found) {
            return side.emitChoiceError("Can't use item: That item isn't in the bag.");
        }
        if (found.item.quantity !== null && found.item.quantity <= 0) {
            return side.emitChoiceError("Can't use item: That item isn't in the bag.");
        }
        const validationError = selectionErrorText(pokemon, found.item, cmd.targetPartyIndex);
        if (validationError) {
            return side.emitChoiceError(`Can't use item: ${validationError}`);
        }
        const selection = {
            playerSlot,
            itemId: found.item.id,
            targetPartyIndex: cmd.targetPartyIndex,
        };
        pokemon.m = pokemon.m ?? {};
        pokemon.m.trainerItemChoice = selection;
        side.choice.actions.push({
            choice: "event",
            event: "TrainerItem",
            pokemon,
            order: 103,
            subOrder: 1,
            priority: 0,
        });
        return true;
    }
    _installTrainerItemHandler(battle) {
        battle.format.onTrainerItem = (pokemon) => {
            this._runTrainerItemEvent(battle, pokemon);
        };
    }
    _runTrainerItemEvent(battle, source) {
        const selection = (source.m?.trainerItemChoice ?? null);
        if (source.m?.trainerItemChoice) {
            delete source.m.trainerItemChoice;
        }
        if (!selection) {
            return;
        }
        const bagState = this._bags[selection.playerSlot];
        const found = findBattleBagItem(bagState, selection.itemId);
        if (!found || (found.item.quantity !== null && found.item.quantity <= 0)) {
            battle.add("message", "But it had no effect!");
            return;
        }
        const target = targetPokemonForItem(source, found.item, selection.targetPartyIndex);
        if (!canUseTrainerItemNow(source, found.item, target)) {
            battle.add("message", "But it had no effect!");
            return;
        }
        battle.add("message", `${source.side.name} used ${articleFor(found.item.name)} ${found.item.name}.`);
        if (!this._applyTrainerItemEffect(battle, source, target, found.item)) {
            battle.add("message", "But it had no effect!");
            return;
        }
        if (found.item.quantity !== null) {
            found.item.quantity = Math.max(0, found.item.quantity - 1);
        }
    }
    _applyTrainerItemEffect(battle, source, target, item) {
        switch (item.id) {
            case "POTION":
                return this._healPokemon(battle, target, 20, item);
            case "SUPERPOTION":
                return this._healPokemon(battle, target, 60, item);
            case "HYPERPOTION":
                return this._healPokemon(battle, target, 120, item);
            case "SITRUSBERRY":
                return this._healPokemon(battle, target, Math.max(1, Math.floor((target?.maxhp ?? 0) / 4)), item);
            case "FULLHEAL":
            case "LUMBERRY":
                return this._curePokemonStatus(battle, target);
            case "FULLRESTORE":
                return this._fullRestorePokemon(battle, target, item);
            case "DIREHIT":
                if (!target)
                    return false;
                if (!target.addVolatile("focusenergy", source, itemEffect(item)))
                    return false;
                battle.add("message", `${target.name} is getting pumped!`);
                return true;
            case "GUARDSPEC":
                if (!source.side.addSideCondition("mist", source, itemEffect(item)))
                    return false;
                battle.add("message", `${source.side.name} became shrouded in mist!`);
                return true;
            default:
                return false;
        }
    }
    _healPokemon(battle, target, amount, item) {
        if (!target)
            return false;
        const healed = target.heal(amount, target, itemEffect(item));
        if (!healed)
            return false;
        battle.add("-heal", target, hpStatusText(target), `[from] item: ${item.name}`);
        return true;
    }
    _curePokemonStatus(battle, target) {
        if (!target)
            return false;
        let changed = false;
        if (target.status) {
            changed = target.cureStatus() || changed;
        }
        if (target.volatiles["confusion"]) {
            changed = target.removeVolatile("confusion") || changed;
        }
        if (changed && !target.status) {
            battle.add("message", `${target.name} became healthy.`);
        }
        return changed;
    }
    _fullRestorePokemon(battle, target, item) {
        if (!target)
            return false;
        const cured = this._curePokemonStatus(battle, target);
        const healed = this._healPokemon(battle, target, target.maxhp, item);
        return cured || healed;
    }
    _decoratePlayerState(playerSlot, state) {
        return {
            ...state,
            bag: toBattleBagView(this._bags[playerSlot]),
        };
    }
    _handleSend(type, data) {
        const raw = Array.isArray(data) ? data.join("\n") : data;
        if (type === "update") {
            const events = parseShowdownChunk(raw);
            this._translators[0].apply(events);
            this._translators[1].apply(events);
            this._spectatorTranslator.apply(events);
            const snap0 = this._decoratePlayerState(0, this._translators[0].snapshot());
            const snap1 = this._decoratePlayerState(1, this._translators[1].snapshot());
            const spectatorSnap = this._spectatorTranslator.snapshot();
            this._emit({ type: "state", playerSlot: 0, state: snap0 });
            this._emit({ type: "state", playerSlot: 1, state: snap1 });
            this._emit({ type: "spectator-state", state: spectatorSnap });
            if (snap0.phase === "ended") {
                const winner = snap0.winnerName;
                const slot = winner === snap0.sides[0].playerName
                    ? 0
                    : winner === snap0.sides[1].playerName
                        ? 1
                        : null;
                this._emit({ type: "ended", winnerSlot: slot });
            }
            return;
        }
        if (type === "sideupdate") {
            const lines = raw.split("\n");
            const sideStr = lines[0];
            const rest = lines.slice(1).join("\n");
            const sideIdx = sideStr === "p2" ? 1 : 0;
            const events = parseShowdownChunk(rest);
            this._translators[sideIdx].apply(events);
            const snap = this._decoratePlayerState(sideIdx, this._translators[sideIdx].snapshot());
            this._emit({ type: "state", playerSlot: sideIdx, state: snap });
        }
    }
}
