import { readFileSync } from 'fs';
/**
 * Parses a PBS file into a map of id -> key/value block.
 * Handles BOM, comment lines, section separators, and multi-value fields.
 */
export function parsePbsFile(filePath) {
    const raw = readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM
    const result = new Map();
    let currentId = null;
    let currentBlock = {};
    for (const rawLine of raw.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (line === '' || line.startsWith('#'))
            continue;
        const idMatch = line.match(/^\[([^\]]+)\]$/);
        if (idMatch) {
            if (currentId !== null) {
                result.set(currentId, currentBlock);
            }
            currentId = idMatch[1].trim().toUpperCase();
            currentBlock = {};
            continue;
        }
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1 || currentId === null)
            continue;
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim();
        currentBlock[key] = value;
    }
    if (currentId !== null) {
        result.set(currentId, currentBlock);
    }
    return result;
}
