export function parseAbilityBlock(id, block, provenance, errors) {
    if (!block['Name']) {
        errors.push({ id, field: 'Name', message: 'Missing required field: Name', severity: 'error' });
        return null;
    }
    return {
        id,
        name: block['Name'],
        description: block['Description'] ?? '',
        provenance,
    };
}
