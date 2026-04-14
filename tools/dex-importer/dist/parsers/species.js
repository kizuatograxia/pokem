function parseBaseStats(raw) {
    const [hp, atk, def, spe, spa, spd] = raw.split(',').map(Number);
    return { hp, atk, def, spe, spa, spd };
}
function parseEvYield(raw) {
    const parts = raw.split(',');
    const result = [];
    for (let i = 0; i < parts.length - 1; i += 2) {
        result.push({ stat: parts[i].trim(), amount: Number(parts[i + 1]) });
    }
    return result;
}
function parseLevelMoves(raw) {
    const parts = raw.split(',');
    const result = [];
    for (let i = 0; i < parts.length - 1; i += 2) {
        result.push({ level: Number(parts[i].trim()), moveId: parts[i + 1].trim().toUpperCase() });
    }
    return result;
}
function parseEvolutions(raw) {
    const parts = raw.split(',');
    const result = [];
    for (let i = 0; i < parts.length - 2; i += 3) {
        result.push({
            targetId: parts[i].trim().toUpperCase(),
            method: parts[i + 1].trim(),
            param: parts[i + 2].trim(),
        });
    }
    return result;
}
function splitIds(raw) {
    return raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
}
export function parseSpeciesBlock(id, block, provenance, errors) {
    const required = ['Name', 'Types', 'BaseStats', 'Moves'];
    for (const field of required) {
        if (!block[field]) {
            errors.push({ id, field, message: `Missing required field: ${field}`, severity: 'error' });
        }
    }
    if (!block['Name'])
        return null;
    const rawTypes = (block['Types'] ?? '').split(',').map(s => s.trim().toUpperCase());
    const types = [rawTypes[0], rawTypes[1]];
    if (!types[0]) {
        errors.push({ id, field: 'Types', message: 'No primary type defined', severity: 'error' });
    }
    const rawStats = block['BaseStats'] ?? '0,0,0,0,0,0';
    const statParts = rawStats.split(',');
    if (statParts.length !== 6) {
        errors.push({ id, field: 'BaseStats', message: `Expected 6 values, got ${statParts.length}`, severity: 'error' });
    }
    return {
        id,
        name: block['Name'] ?? id,
        types,
        baseStats: parseBaseStats(rawStats),
        genderRatio: (block['GenderRatio'] ?? 'Female50Percent'),
        growthRate: block['GrowthRate'] ?? 'Medium',
        baseExp: Number(block['BaseExp'] ?? 0),
        evYield: block['EVs'] ? parseEvYield(block['EVs']) : [],
        catchRate: Number(block['CatchRate'] ?? 45),
        happiness: Number(block['Happiness'] ?? 70),
        abilities: block['Abilities'] ? splitIds(block['Abilities']) : [],
        hiddenAbilities: block['HiddenAbilities'] ? splitIds(block['HiddenAbilities']) : [],
        levelMoves: block['Moves'] ? parseLevelMoves(block['Moves']) : [],
        tutorMoves: block['TutorMoves'] ? splitIds(block['TutorMoves']) : [],
        eggMoves: block['EggMoves'] ? splitIds(block['EggMoves']) : [],
        eggGroups: block['EggGroups'] ? block['EggGroups'].split(',').map(s => s.trim()) : [],
        hatchSteps: Number(block['HatchSteps'] ?? 5120),
        height: parseFloat(block['Height'] ?? '0'),
        weight: parseFloat(block['Weight'] ?? '0'),
        color: block['Color'] ?? '',
        shape: block['Shape'] ?? '',
        habitat: block['Habitat'] ?? null,
        category: block['Category'] ?? '',
        pokedex: block['Pokedex'] ?? '',
        generation: Number(block['Generation'] ?? 1),
        evolutions: block['Evolutions'] ? parseEvolutions(block['Evolutions']) : [],
        metrics: null,
        provenance,
    };
}
