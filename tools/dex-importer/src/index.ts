import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parsePbsFile } from './parsers/pbs.js';
import { parseSpeciesBlock } from './parsers/species.js';
import { parseMoveBlock } from './parsers/moves.js';
import { parseAbilityBlock } from './parsers/abilities.js';
import { parseMetricsBlock } from './parsers/metrics.js';
import { mergeWithConflicts } from './merger.js';
import { validateDataset } from './validator.js';
import { writeDatasets, writeReport, printSummary } from './reporter.js';
import type { ValidationError, ConflictRecord } from './schema/common.js';
import type { Species } from './schema/species.js';
import type { Move } from './schema/move.js';
import type { Ability } from './schema/ability.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(__dirname, '../../..'); // tools/dex-importer/src -> pokém root

const SOURCES = {
  base: join(WORKSPACE, 'sources/pokemon-essentials-21.1/PBS'),
  gen9: join(WORKSPACE, 'sources/generation-9-pack-v3.3.4/PBS'),
};

const OUTPUT_DIR = join(__dirname, '../output');

const validateOnly = process.argv.includes('--validate-only');

// ─── Parse all PBS files ──────────────────────────────────────────────────────

const parseErrors: ValidationError[] = [];

function parseCatalog<T>(
  pbsMap: ReturnType<typeof parsePbsFile>,
  parser: (id: string, block: Record<string, string>, prov: any, errors: ValidationError[]) => T | null,
  provenance: any
): Map<string, T> {
  const result = new Map<string, T>();
  for (const [id, block] of pbsMap) {
    const entry = parser(id, block, provenance, parseErrors);
    if (entry) result.set(id, entry);
  }
  return result;
}

console.log('Parsing base Essentials PBS...');
const baseSpeciesRaw = parsePbsFile(join(SOURCES.base, 'pokemon.txt'));
const baseMovesRaw = parsePbsFile(join(SOURCES.base, 'moves.txt'));
const baseAbilitiesRaw = parsePbsFile(join(SOURCES.base, 'abilities.txt'));
const baseMetricsRaw = parsePbsFile(join(SOURCES.base, 'pokemon_metrics.txt'));

const baseProv = { source: 'essentials-21.1' as const, file: 'PBS/pokemon.txt' };
const baseMoveProv = { source: 'essentials-21.1' as const, file: 'PBS/moves.txt' };
const baseAbilityProv = { source: 'essentials-21.1' as const, file: 'PBS/abilities.txt' };

const baseSpecies = parseCatalog(baseSpeciesRaw, parseSpeciesBlock, baseProv);
const baseMoves = parseCatalog(baseMovesRaw, parseMoveBlock, baseMoveProv);
const baseAbilities = parseCatalog(baseAbilitiesRaw, parseAbilityBlock, baseAbilityProv);

// Apply metrics to base
for (const [id, species] of baseSpecies) {
  const metricsBlock = baseMetricsRaw.get(id);
  if (metricsBlock) {
    species.metrics = parseMetricsBlock(id, metricsBlock, parseErrors);
  }
}

console.log(`  Base: ${baseSpecies.size} species | ${baseMoves.size} moves | ${baseAbilities.size} abilities`);

console.log('Parsing Gen9 Pack PBS...');
const gen9SpeciesRaw = parsePbsFile(join(SOURCES.gen9, 'pokemon_base_Gen_9_Pack.txt'));
const gen9MovesRaw = parsePbsFile(join(SOURCES.gen9, 'moves_Gen_9_Pack.txt'));
const gen9AbilitiesRaw = parsePbsFile(join(SOURCES.gen9, 'abilities_Gen_9_Pack.txt'));
// Gen9 Pack often has its own metrics file for new mons, and a full metrics override for vanilla mons
const gen9MetricsBaseRaw = parsePbsFile(join(SOURCES.gen9, 'pokemon_metrics.txt'));
const gen9MetricsPackRaw = parsePbsFile(join(SOURCES.gen9, 'pokemon_metrics_Gen_9_Pack.txt'));

const gen9Prov = { source: 'gen9-pack-3.3.4' as const, file: 'PBS/pokemon_base_Gen_9_Pack.txt' };
const gen9MoveProv = { source: 'gen9-pack-3.3.4' as const, file: 'PBS/moves_Gen_9_Pack.txt' };
const gen9AbilityProv = { source: 'gen9-pack-3.3.4' as const, file: 'PBS/abilities_Gen_9_Pack.txt' };

const gen9Species = parseCatalog(gen9SpeciesRaw, parseSpeciesBlock, gen9Prov);
const gen9Moves = parseCatalog(gen9MovesRaw, parseMoveBlock, gen9MoveProv);
const gen9Abilities = parseCatalog(gen9AbilitiesRaw, parseAbilityBlock, gen9AbilityProv);

// Apply metrics to gen9 (merge base override + pack specific)
const combinedGen9Metrics = new Map([...gen9MetricsBaseRaw, ...gen9MetricsPackRaw]);
for (const [id, species] of gen9Species) {
  const metricsBlock = combinedGen9Metrics.get(id);
  if (metricsBlock) {
    species.metrics = parseMetricsBlock(id, metricsBlock, parseErrors);
  }
}

// Also back-port gen9 metrics to base species if they exist in gen9 metrics files
for (const [id, species] of baseSpecies) {
  const metricsBlock = combinedGen9Metrics.get(id);
  if (metricsBlock) {
    species.metrics = parseMetricsBlock(id, metricsBlock, parseErrors);
  }
}

console.log(`  Gen9: ${gen9Species.size} species | ${gen9Moves.size} moves | ${gen9Abilities.size} abilities`);

// ─── Also parse pokemon_forms for completeness (logged but not deep-merged yet) ─
let formsCount = 0;
try {
  const baseFormsRaw = parsePbsFile(join(SOURCES.base, 'pokemon_forms.txt'));
  const gen9FormsRaw = parsePbsFile(join(SOURCES.gen9, 'pokemon_forms_Gen_9_Pack.txt'));
  formsCount = baseFormsRaw.size + gen9FormsRaw.size;
} catch { /* forms optional */ }

// ─── Merge ───────────────────────────────────────────────────────────────────

console.log('\nMerging datasets...');
const allConflicts: ConflictRecord[] = [];

const speciesFields: (keyof Species)[] = ['name', 'types', 'baseStats', 'genderRatio', 'growthRate', 'catchRate'];
const moveFields: (keyof Move)[] = ['name', 'type', 'category', 'power', 'accuracy', 'pp', 'target', 'functionCode'];
const abilityFields: (keyof Ability)[] = ['name', 'description'];

const { merged: species, conflicts: speciesConflicts } = mergeWithConflicts(
  baseSpecies, gen9Species, 'gen9-pack-3.3.4', 'essentials-21.1', speciesFields
);
const { merged: moves, conflicts: moveConflicts } = mergeWithConflicts(
  baseMoves, gen9Moves, 'gen9-pack-3.3.4', 'essentials-21.1', moveFields
);
const { merged: abilities, conflicts: abilityConflicts } = mergeWithConflicts(
  baseAbilities, gen9Abilities, 'gen9-pack-3.3.4', 'essentials-21.1', abilityFields
);

allConflicts.push(...speciesConflicts, ...moveConflicts, ...abilityConflicts);
console.log(`  Merged: ${species.size} species | ${moves.size} moves | ${abilities.size} abilities`);
console.log(`  ${allConflicts.length} conflicts detected`);
if (formsCount > 0) console.log(`  ${formsCount} form entries found (not deep-merged yet)`);

// ─── Validate ────────────────────────────────────────────────────────────────

console.log('\nValidating...');
const { errors, warnings } = validateDataset(species, moves, abilities, parseErrors);

// ─── Output ──────────────────────────────────────────────────────────────────

printSummary(species, moves, abilities, errors, warnings, allConflicts);

if (!validateOnly) {
  console.log('Writing datasets...');
  writeDatasets(OUTPUT_DIR, species, moves, abilities);
}

const reportPath = writeReport(OUTPUT_DIR, errors, warnings, allConflicts);
console.log(`Report written: ${reportPath}`);

if (errors.length > 0) {
  process.exit(1);
}
