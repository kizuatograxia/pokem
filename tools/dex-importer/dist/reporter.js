import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
function ensureDir(dir) {
    mkdirSync(dir, { recursive: true });
}
function writeJson(filePath, data) {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
export function writeDatasets(outputDir, species, moves, abilities) {
    const datasetsDir = join(outputDir, 'datasets');
    ensureDir(datasetsDir);
    writeJson(join(datasetsDir, 'species.json'), Object.fromEntries(species));
    writeJson(join(datasetsDir, 'moves.json'), Object.fromEntries(moves));
    writeJson(join(datasetsDir, 'abilities.json'), Object.fromEntries(abilities));
}
export function writeReport(outputDir, errors, warnings, conflicts) {
    const reportsDir = join(outputDir, 'reports');
    ensureDir(reportsDir);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const lines = [];
    lines.push(`# Import Report — ${timestamp}`);
    lines.push('');
    lines.push(`## Summary`);
    lines.push(`- Errors:    ${errors.length}`);
    lines.push(`- Warnings:  ${warnings.length}`);
    lines.push(`- Conflicts: ${conflicts.length}`);
    lines.push('');
    if (conflicts.length > 0) {
        lines.push('## Conflicts (base vs Gen9 — Gen9 wins)');
        lines.push('');
        for (const c of conflicts) {
            lines.push(`### ${c.id} — field: ${c.field}`);
            lines.push(`- base (${c.sources[0]}): ${JSON.stringify(c.baseValue)}`);
            lines.push(`- override (${c.sources[1]}): ${JSON.stringify(c.overrideValue)}`);
            lines.push('');
        }
    }
    if (errors.length > 0) {
        lines.push('## Errors');
        lines.push('');
        for (const e of errors) {
            lines.push(`- [${e.id}] ${e.field}: ${e.message}`);
        }
        lines.push('');
    }
    if (warnings.length > 0) {
        lines.push('## Warnings');
        lines.push('');
        for (const w of warnings) {
            lines.push(`- [${w.id}] ${w.field}: ${w.message}`);
        }
        lines.push('');
    }
    const reportPath = join(reportsDir, `report-${timestamp}.md`);
    writeFileSync(reportPath, lines.join('\n'), 'utf-8');
    return reportPath;
}
export function printSummary(species, moves, abilities, errors, warnings, conflicts) {
    console.log('\n=== DEX IMPORTER ===\n');
    console.log(`Species:   ${species.size}`);
    console.log(`Moves:     ${moves.size}`);
    console.log(`Abilities: ${abilities.size}`);
    console.log('');
    console.log(`Conflicts: ${conflicts.length}`);
    console.log(`Errors:    ${errors.length}`);
    console.log(`Warnings:  ${warnings.length}`);
    console.log('');
    if (errors.length > 0) {
        console.log('--- ERRORS ---');
        for (const e of errors.slice(0, 20)) {
            console.log(`  [${e.id}] ${e.field}: ${e.message}`);
        }
        if (errors.length > 20)
            console.log(`  ... and ${errors.length - 20} more`);
        console.log('');
    }
}
