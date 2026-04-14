/**
 * Fields that are intentionally overridden by Gen9 pack and should NOT be flagged as conflicts.
 * These are expected expansions (new moves, new tutor moves, etc.).
 */
const SILENT_OVERRIDE_FIELDS = new Set(['TutorMoves', 'EggMoves', 'Moves', 'Pokedex']);
/**
 * Merges two parsed maps (base + expansion), recording conflicts.
 * Gen9 entries win on conflict; conflicts are surfaced explicitly.
 */
export function mergeWithConflicts(base, expansion, expansionLayer, baseLayer, compareFields) {
    const merged = new Map(base);
    const conflicts = [];
    for (const [id, expEntry] of expansion) {
        const baseEntry = merged.get(id);
        if (!baseEntry) {
            // New entry from expansion, no conflict
            merged.set(id, expEntry);
            continue;
        }
        // Entry exists in both: check each field for divergence
        for (const field of compareFields) {
            const baseVal = baseEntry[field];
            const expVal = expEntry[field];
            const fieldName = String(field);
            if (SILENT_OVERRIDE_FIELDS.has(fieldName))
                continue;
            const baseStr = JSON.stringify(baseVal);
            const expStr = JSON.stringify(expVal);
            if (baseStr !== expStr) {
                conflicts.push({
                    id,
                    field: fieldName,
                    baseValue: baseVal,
                    overrideValue: expVal,
                    resolvedTo: expVal,
                    sources: [baseLayer, expansionLayer],
                });
            }
        }
        // Gen9 wins: merge on top of base
        merged.set(id, { ...baseEntry, ...expEntry });
    }
    return { merged, conflicts };
}
