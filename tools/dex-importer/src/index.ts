import { join, dirname, isAbsolute, resolve } from 'path';
import { fileURLToPath } from 'url';
import { parsePbsFile } from './parsers/pbs.js';
import { parseSpeciesBlock } from './parsers/species.js';
import { parseMoveBlock } from './parsers/moves.js';
import { parseAbilityBlock } from './parsers/abilities.js';
import { parseMetricsBlock } from './parsers/metrics.js';
import { mergeWithConflicts } from './merger.js';
import { validateDataset } from './validator.js';
import { writeDatasets, writeReport, printSummary } from './reporter.js';
import { inspectRom } from './rom/inspect.js';
import { inspectRomNarc, writeRomNarcInspection } from './rom/narc.js';
import { printRomInspectionSummary, writeRomInspection } from './rom/output.js';
import type { ValidationError, ConflictRecord } from './schema/common.js';
import type { Species } from './schema/species.js';
import type { Move } from './schema/move.js';
import type { Ability } from './schema/ability.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKSPACE = join(__dirname, '../../..');

const SOURCES = {
  base: join(WORKSPACE, 'sources/pokemon-essentials-21.1/PBS'),
  gen9: join(WORKSPACE, 'sources/generation-9-pack-v3.3.4/PBS'),
};

const OUTPUT_DIR = join(__dirname, '../output');

interface CliArgs {
  validateOnly: boolean;
  romPath: string | null;
  narcPath: string | null;
  extractFiles: boolean;
  extractLimit: number | null;
}

function parseCliArgs(argv: string[]): CliArgs {
  let romPath: string | null = null;
  let narcPath: string | null = null;
  let extractLimit: number | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--rom') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('Missing ROM path after --rom.');
      }
      romPath = next;
      index += 1;
      continue;
    }

    if (argv[index] === '--narc') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('Missing NARC path after --narc.');
      }
      narcPath = next;
      index += 1;
      continue;
    }

    if (argv[index] === '--extract-limit') {
      const next = argv[index + 1];
      if (!next) {
        throw new Error('Missing value after --extract-limit.');
      }
      const parsed = Number(next);
      if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid --extract-limit value: ${next}`);
      }
      extractLimit = parsed;
      index += 1;
    }
  }

  return {
    validateOnly: argv.includes('--validate-only'),
    romPath,
    narcPath,
    extractFiles: argv.includes('--extract-files'),
    extractLimit,
  };
}

function resolveCliPath(inputPath: string) {
  return isAbsolute(inputPath) ? inputPath : resolve(process.cwd(), inputPath);
}

function runRomImport(romPath: string) {
  const inspection = inspectRom(resolveCliPath(romPath));
  printRomInspectionSummary(inspection);

  const output = writeRomInspection(OUTPUT_DIR, inspection);
  console.log(`Manifest written: ${output.manifestPath}`);
  console.log(`Filesystem written: ${output.filesystemPath}`);
  console.log(`Summary written: ${output.summaryPath}`);
}

function runRomNarcImport(romPath: string, narcPath: string, extractFiles: boolean, extractLimit: number | null) {
  const inspection = inspectRomNarc(resolveCliPath(romPath), narcPath);
  const output = writeRomNarcInspection(OUTPUT_DIR, inspection, {
    extractFiles,
    extractLimit,
  });

  console.log('\n=== ROM NARC INSPECT ===\n');
  console.log(`ROM file:     ${inspection.romFileName}`);
  console.log(`NARC path:    ${inspection.narcPath}`);
  console.log(`Subfiles:     ${inspection.fileCount}`);
  console.log(`Size:         ${inspection.narcSize} bytes`);
  console.log(`Top magics:   ${inspection.magicHistogram.slice(0, 8).map((entry) => `${entry.magic}=${entry.count}`).join(', ')}`);
  console.log(`Manifest:     ${output.manifestPath}`);
  console.log(`Files list:   ${output.filesPath}`);
  console.log(`Summary:      ${output.summaryPath}`);
  if (output.extractedDir) {
    console.log(`Extracted:    ${output.extractedDir}`);
  }
  console.log('');
}

function runPbsImport(validateOnly: boolean) {
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
  const gen9MetricsBaseRaw = parsePbsFile(join(SOURCES.gen9, 'pokemon_metrics.txt'));
  const gen9MetricsPackRaw = parsePbsFile(join(SOURCES.gen9, 'pokemon_metrics_Gen_9_Pack.txt'));

  const gen9Prov = { source: 'gen9-pack-3.3.4' as const, file: 'PBS/pokemon_base_Gen_9_Pack.txt' };
  const gen9MoveProv = { source: 'gen9-pack-3.3.4' as const, file: 'PBS/moves_Gen_9_Pack.txt' };
  const gen9AbilityProv = { source: 'gen9-pack-3.3.4' as const, file: 'PBS/abilities_Gen_9_Pack.txt' };

  const gen9Species = parseCatalog(gen9SpeciesRaw, parseSpeciesBlock, gen9Prov);
  const gen9Moves = parseCatalog(gen9MovesRaw, parseMoveBlock, gen9MoveProv);
  const gen9Abilities = parseCatalog(gen9AbilitiesRaw, parseAbilityBlock, gen9AbilityProv);

  const combinedGen9Metrics = new Map([...gen9MetricsBaseRaw, ...gen9MetricsPackRaw]);
  for (const [id, species] of gen9Species) {
    const metricsBlock = combinedGen9Metrics.get(id);
    if (metricsBlock) {
      species.metrics = parseMetricsBlock(id, metricsBlock, parseErrors);
    }
  }

  for (const [id, species] of baseSpecies) {
    const metricsBlock = combinedGen9Metrics.get(id);
    if (metricsBlock) {
      species.metrics = parseMetricsBlock(id, metricsBlock, parseErrors);
    }
  }

  console.log(`  Gen9: ${gen9Species.size} species | ${gen9Moves.size} moves | ${gen9Abilities.size} abilities`);

  let formsCount = 0;
  try {
    const baseFormsRaw = parsePbsFile(join(SOURCES.base, 'pokemon_forms.txt'));
    const gen9FormsRaw = parsePbsFile(join(SOURCES.gen9, 'pokemon_forms_Gen_9_Pack.txt'));
    formsCount = baseFormsRaw.size + gen9FormsRaw.size;
  } catch {
    // forms are optional
  }

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
  if (formsCount > 0) {
    console.log(`  ${formsCount} form entries found (not deep-merged yet)`);
  }

  console.log('\nValidating...');
  const { errors, warnings } = validateDataset(species, moves, abilities, parseErrors);

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
}

const cli = parseCliArgs(process.argv.slice(2));

if (cli.romPath && cli.narcPath) {
  runRomNarcImport(cli.romPath, cli.narcPath, cli.extractFiles, cli.extractLimit);
} else if (cli.romPath) {
  runRomImport(cli.romPath);
} else {
  runPbsImport(cli.validateOnly);
}
