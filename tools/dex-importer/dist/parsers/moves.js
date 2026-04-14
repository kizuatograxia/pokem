export function parseMoveBlock(id, block, provenance, errors) {
    if (!block['Name']) {
        errors.push({ id, field: 'Name', message: 'Missing required field: Name', severity: 'error' });
        return null;
    }
    const category = block['Category'];
    if (category && !['Physical', 'Special', 'Status'].includes(category)) {
        errors.push({ id, field: 'Category', message: `Unknown category: ${category}`, severity: 'warning' });
    }
    const rawPower = block['Power'];
    const rawAccuracy = block['Accuracy'];
    const rawChance = block['EffectChance'];
    const flags = block['Flags'] ? block['Flags'].split(',').map(s => s.trim()).filter(Boolean) : [];
    return {
        id,
        name: block['Name'],
        type: (block['Type'] ?? 'NORMAL').toUpperCase(),
        category: (category ?? 'Physical'),
        power: rawPower ? Number(rawPower) : null,
        accuracy: rawAccuracy ? Number(rawAccuracy) : null,
        pp: Number(block['TotalPP'] ?? 5),
        target: (block['Target'] ?? 'NearOther'),
        functionCode: block['FunctionCode'] ?? 'None',
        flags,
        effectChance: rawChance ? Number(rawChance) : null,
        description: block['Description'] ?? '',
        provenance,
    };
}
