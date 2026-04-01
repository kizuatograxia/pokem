// ─── Ident parsing ───────────────────────────────────────────────────────────
// Showdown ident format: "p1a: Charizard" or just "p1: Charizard"
// Details format:        "Charizard, L50, M" or "Charizard"
function parseSide(raw) {
    return raw.startsWith('p2') ? 'p2' : 'p1';
}
function parseIdent(identStr, detailsStr = '') {
    // identStr: "p1a: Charizard"
    const colonIdx = identStr.indexOf(':');
    const locPart = colonIdx !== -1 ? identStr.slice(0, colonIdx).trim() : identStr.trim();
    const name = colonIdx !== -1 ? identStr.slice(colonIdx + 1).trim() : identStr.trim();
    const side = locPart.startsWith('p2') ? 'p2' : 'p1';
    const slot = locPart.length > 2 ? locPart[2] : 'a';
    // details: "Charizard, L50, M, shiny" etc.
    const parts = detailsStr.split(',').map(s => s.trim());
    const species = parts[0] || name;
    let level = 100;
    let gender = 'N';
    let shiny = false;
    for (const part of parts.slice(1)) {
        if (part.startsWith('L'))
            level = parseInt(part.slice(1), 10);
        else if (part === 'M')
            gender = 'M';
        else if (part === 'F')
            gender = 'F';
        else if (part === 'shiny')
            shiny = true;
    }
    return { side, slot, name, species, level, gender, shiny };
}
// ─── HP/status parsing ───────────────────────────────────────────────────────
// Format: "72/200" or "72/200 par" or "0 fnt" or "100/100"
export function parseHpStatus(raw) {
    const fainted = raw === '0 fnt' || raw.endsWith(' fnt');
    if (fainted)
        return { hpCurrent: 0, hpMax: 100, percent: 0, status: null, fainted: true };
    const parts = raw.split(' ');
    const hpPart = parts[0];
    const statusPart = parts[1] ?? null;
    const slashIdx = hpPart.indexOf('/');
    const hpCurrent = slashIdx !== -1 ? parseInt(hpPart.slice(0, slashIdx), 10) : parseInt(hpPart, 10);
    const hpMax = slashIdx !== -1 ? parseInt(hpPart.slice(slashIdx + 1), 10) : 100;
    const percent = hpMax > 0 ? Math.round((hpCurrent / hpMax) * 100) : 0;
    return { hpCurrent, hpMax, percent, status: statusPart, fainted: false };
}
// ─── Main parser ─────────────────────────────────────────────────────────────
export function parseShowdownLine(line) {
    if (!line.startsWith('|'))
        return null;
    const parts = line.slice(1).split('|');
    const cmd = parts[0];
    switch (cmd) {
        case 'player':
            return { type: 'player', side: parts[1], name: parts[2] ?? '', avatar: parts[3] ?? '' };
        case 'teamsize':
            return { type: 'teamsize', side: parts[1], size: parseInt(parts[2], 10) };
        case 'gametype':
            return { type: 'gametype', format: parts[1] ?? '' };
        case 'gen':
            return { type: 'gen', gen: parseInt(parts[1], 10) };
        case 'tier':
            return { type: 'tier', name: parts[1] ?? '' };
        case 'teampreview':
            return { type: 'teampreview' };
        case 'start':
            return { type: 'start' };
        case 'turn':
            return { type: 'turn', turn: parseInt(parts[1], 10) };
        case 'win':
            return { type: 'win', player: parts[1] ?? '' };
        case 'tie':
            return { type: 'tie' };
        case 'switch':
        case 'drag': {
            const ident = parseIdent(parts[1], parts[2]);
            return { type: cmd, ident, hpStatus: parts[3] ?? '100/100', side: parseSide(parts[1]) };
        }
        case 'faint':
            return { type: 'faint', ident: parseIdent(parts[1]) };
        case 'move': {
            const missed = parts[4] === '[miss]';
            const targetRaw = parts[3];
            const target = targetRaw && targetRaw !== '[still]' ? parseIdent(targetRaw) : null;
            return { type: 'move', ident: parseIdent(parts[1]), moveName: parts[2] ?? '', targetIdent: target, missed };
        }
        case '-damage':
            return { type: 'damage', ident: parseIdent(parts[1]), hpStatus: parts[2] ?? '0', from: extractFrom(parts) };
        case '-heal':
            return { type: 'heal', ident: parseIdent(parts[1]), hpStatus: parts[2] ?? '100/100', from: extractFrom(parts) };
        case '-sethp':
            return { type: 'sethp', ident: parseIdent(parts[1]), hpStatus: parts[2] ?? '0' };
        case '-status':
            return { type: 'status', ident: parseIdent(parts[1]), status: parts[2] ?? '' };
        case '-curestatus':
            return { type: 'curestatus', ident: parseIdent(parts[1]), status: parts[2] ?? '' };
        case '-cureteam':
            return { type: 'cureteam', ident: parseIdent(parts[1]) };
        case '-boost':
            return { type: 'boost', ident: parseIdent(parts[1]), stat: parts[2] ?? '', amount: parseInt(parts[3], 10) };
        case '-unboost':
            return { type: 'unboost', ident: parseIdent(parts[1]), stat: parts[2] ?? '', amount: parseInt(parts[3], 10) };
        case '-setboost':
            return { type: 'setboost', ident: parseIdent(parts[1]), stat: parts[2] ?? '', amount: parseInt(parts[3], 10) };
        case '-clearboost':
            return { type: 'clearboost', ident: parseIdent(parts[1]) };
        case '-weather':
            return { type: 'weather', weather: parts[1] ?? 'none', from: extractFrom(parts) };
        case '-fieldstart':
            return { type: 'fieldstart', condition: parts[1] ?? '', from: extractFrom(parts) };
        case '-fieldend':
            return { type: 'fieldend', condition: parts[1] ?? '' };
        case '-sidestart':
            return { type: 'sidestart', side: parseSide(parts[1]), condition: parts[2] ?? '' };
        case '-sideend':
            return { type: 'sideend', side: parseSide(parts[1]), condition: parts[2] ?? '' };
        case '-ability':
            return { type: 'ability', ident: parseIdent(parts[1]), ability: parts[2] ?? '', from: extractFrom(parts) };
        case '-item':
            return { type: 'item', ident: parseIdent(parts[1]), item: parts[2] ?? '', from: extractFrom(parts) };
        case '-enditem':
            return { type: 'enditem', ident: parseIdent(parts[1]), item: parts[2] ?? '', from: extractFrom(parts) };
        case '-transform':
            return { type: 'transform', ident: parseIdent(parts[1]), targetIdent: parseIdent(parts[2]) };
        case '-mega':
            return { type: 'mega', ident: parseIdent(parts[1]), megaStone: parts[3] ?? '' };
        case '-terastallize':
            return { type: 'terastallize', ident: parseIdent(parts[1]), teraType: parts[2] ?? '' };
        case 'cant':
            return { type: 'cant', ident: parseIdent(parts[1]), reason: parts[2] ?? '', move: parts[3] };
        case '-fail':
            return { type: 'fail', ident: parseIdent(parts[1]), reason: parts[2] };
        case '-miss':
            return { type: 'miss', ident: parseIdent(parts[1]), targetIdent: parts[2] ? parseIdent(parts[2]) : null };
        case '-immune':
            return { type: 'immune', ident: parseIdent(parts[1]), from: extractFrom(parts) };
        case '-activate': {
            const identRaw = parts[1];
            return {
                type: 'activate',
                ident: identRaw ? parseIdent(identRaw) : null,
                condition: parts[2] ?? '',
                detail: parts[3],
            };
        }
        case '-message':
        case 'message':
            return { type: 'message', text: parts[1] ?? '' };
        case 'request': {
            try {
                const json = JSON.parse(parts[1] ?? '{}');
                return { type: 'request', json };
            }
            catch {
                return { type: 'error', message: `Failed to parse request JSON: ${parts[1]}` };
            }
        }
        case 'error':
            return { type: 'error', message: parts[1] ?? '' };
        default:
            return { type: 'unknown', raw: line };
    }
}
function extractFrom(parts) {
    for (const p of parts) {
        if (p.startsWith('[from]'))
            return p.slice(7).trim();
    }
    return undefined;
}
export function parseShowdownChunk(chunk) {
    return chunk
        .split('\n')
        .map(line => parseShowdownLine(line.trim()))
        .filter((e) => e !== null);
}
