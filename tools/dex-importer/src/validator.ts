import type { Species } from './schema/species.js';
import type { Move } from './schema/move.js';
import type { Ability } from './schema/ability.js';
import type { ValidationError } from './schema/common.js';

export interface ValidationReport {
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateDataset(
  species: Map<string, Species>,
  moves: Map<string, Move>,
  abilities: Map<string, Ability>,
  parseErrors: ValidationError[]
): ValidationReport {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Separate parse-time errors from cross-reference errors
  for (const e of parseErrors) {
    (e.severity === 'error' ? errors : warnings).push(e);
  }

  for (const [id, s] of species) {
    // Check ability references
    for (const abilityId of [...s.abilities, ...s.hiddenAbilities]) {
      if (!abilities.has(abilityId)) {
        warnings.push({
          id,
          field: 'Abilities',
          message: `References unknown ability: ${abilityId}`,
          severity: 'warning',
        });
      }
    }

    // Check move references
    const allMoveIds = [
      ...s.levelMoves.map(m => m.moveId),
      ...s.tutorMoves,
      ...s.eggMoves,
    ];
    for (const moveId of allMoveIds) {
      if (!moves.has(moveId)) {
        warnings.push({
          id,
          field: 'Moves',
          message: `References unknown move: ${moveId}`,
          severity: 'warning',
        });
      }
    }

    // Check evolution targets
    for (const evo of s.evolutions) {
      if (!species.has(evo.targetId)) {
        warnings.push({
          id,
          field: 'Evolutions',
          message: `Evolution target not found: ${evo.targetId}`,
          severity: 'warning',
        });
      }
    }

    // Stat sanity
    const stats = s.baseStats;
    const statValues = [stats.hp, stats.atk, stats.def, stats.spe, stats.spa, stats.spd];
    if (statValues.some(v => isNaN(v) || v < 1)) {
      errors.push({ id, field: 'BaseStats', message: 'One or more base stats are invalid', severity: 'error' });
    }
    if (statValues.reduce((a, b) => a + b, 0) > 780) {
      warnings.push({ id, field: 'BaseStats', message: 'BST exceeds 780 — verify intentionality', severity: 'warning' });
    }
  }

  return { errors, warnings };
}
