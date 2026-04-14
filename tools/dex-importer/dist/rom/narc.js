import { mkdirSync, openSync, readSync, writeFileSync, closeSync } from 'fs';
import { basename, join } from 'path';
import { inspectRom } from './inspect.js';
function ensureDir(dir) {
    mkdirSync(dir, { recursive: true });
}
function writeJson(filePath, data) {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
function sanitizePath(value) {
    return value.replace(/[\\/]+/g, '_').replace(/[^a-zA-Z0-9._-]+/g, '-');
}
function readRomSlice(romPath, offset, size) {
    const handle = openSync(romPath, 'r');
    try {
        const buffer = Buffer.alloc(size);
        const bytesRead = readSync(handle, buffer, 0, size, offset);
        if (bytesRead !== size) {
            throw new Error(`Expected to read ${size} bytes at offset ${offset}, got ${bytesRead}.`);
        }
        return buffer;
    }
    finally {
        closeSync(handle);
    }
}
function getAsciiSignature(buffer, offset) {
    const raw = buffer.toString('ascii', offset, offset + 4);
    if (/^[A-Z0-9_ ]{4}$/.test(raw)) {
        return raw.trim();
    }
    return '';
}
function readLzSize(buffer) {
    const declared = buffer.readUIntLE(1, 3);
    if (declared !== 0) {
        return { size: declared, headerSize: 4 };
    }
    if (buffer.length < 8) {
        throw new Error('Compressed stream is too short to contain the extended size header.');
    }
    return { size: buffer.readUInt32LE(4), headerSize: 8 };
}
function decompressLz10(buffer) {
    const { size, headerSize } = readLzSize(buffer);
    const output = Buffer.alloc(size);
    let input = headerSize;
    let out = 0;
    while (out < size && input < buffer.length) {
        const flags = buffer[input++];
        for (let mask = 0x80; mask !== 0 && out < size; mask >>= 1) {
            if ((flags & mask) === 0) {
                output[out++] = buffer[input++];
                continue;
            }
            const first = buffer[input++];
            const second = buffer[input++];
            const length = (first >> 4) + 3;
            const displacement = (((first & 0x0f) << 8) | second) + 1;
            for (let copy = 0; copy < length && out < size; copy += 1) {
                output[out] = output[out - displacement];
                out += 1;
            }
        }
    }
    return output;
}
function decompressLz11(buffer) {
    const { size, headerSize } = readLzSize(buffer);
    const output = Buffer.alloc(size);
    let input = headerSize;
    let out = 0;
    while (out < size && input < buffer.length) {
        const flags = buffer[input++];
        for (let mask = 0x80; mask !== 0 && out < size; mask >>= 1) {
            if ((flags & mask) === 0) {
                output[out++] = buffer[input++];
                continue;
            }
            const first = buffer[input++];
            let length = 0;
            let displacement = 0;
            if ((first >> 4) === 0) {
                const second = buffer[input++];
                const third = buffer[input++];
                length = (((first & 0x0f) << 4) | (second >> 4)) + 0x11;
                displacement = (((second & 0x0f) << 8) | third) + 1;
            }
            else if ((first >> 4) === 1) {
                const second = buffer[input++];
                const third = buffer[input++];
                const fourth = buffer[input++];
                length = (((first & 0x0f) << 12) | (second << 4) | (third >> 4)) + 0x111;
                displacement = (((third & 0x0f) << 8) | fourth) + 1;
            }
            else {
                const second = buffer[input++];
                length = (first >> 4) + 1;
                displacement = (((first & 0x0f) << 8) | second) + 1;
            }
            for (let copy = 0; copy < length && out < size; copy += 1) {
                output[out] = output[out - displacement];
                out += 1;
            }
        }
    }
    return output;
}
function detectInnerMagic(buffer) {
    const ascii = getAsciiSignature(buffer, 0);
    return ascii || 'BIN';
}
function detectSubfileMagic(buffer) {
    if (buffer.length === 0) {
        return 'EMPTY';
    }
    const ascii = getAsciiSignature(buffer, 0);
    if (ascii) {
        return ascii;
    }
    const first = buffer[0];
    if (first === 0x10) {
        const inner = detectInnerMagic(decompressLz10(buffer));
        return inner === 'BIN' ? 'LZ77-10' : `LZ77-10->${inner}`;
    }
    if (first === 0x11) {
        const inner = detectInnerMagic(decompressLz11(buffer));
        return inner === 'BIN' ? 'LZ77-11' : `LZ77-11->${inner}`;
    }
    if (first === 0xb0) {
        return 'RLE-0B';
    }
    return 'BIN';
}
export function inspectRomNarc(romPath, narcPath) {
    const romInspection = inspectRom(romPath);
    const narcEntry = romInspection.filesystem.entries.find((entry) => entry.path === narcPath);
    if (!narcEntry) {
        throw new Error(`NARC path not found in ROM filesystem: ${narcPath}`);
    }
    const buffer = readRomSlice(romInspection.sourcePath, narcEntry.offset, narcEntry.size);
    if (buffer.toString('ascii', 0, 4) !== 'NARC') {
        throw new Error(`ROM entry ${narcPath} is not a NARC archive.`);
    }
    const chunks = [];
    let btafOffset = -1;
    let btafSize = 0;
    let gmifOffset = -1;
    let gmifSize = 0;
    let cursor = 0x10;
    while (cursor + 8 <= buffer.length) {
        const id = buffer.toString('ascii', cursor, cursor + 4);
        const size = buffer.readUInt32LE(cursor + 4);
        if (!/^[A-Z]{4}$/.test(id) || size <= 0) {
            break;
        }
        chunks.push({ id, offset: cursor, size });
        if (id === 'BTAF') {
            btafOffset = cursor;
            btafSize = size;
        }
        else if (id === 'GMIF') {
            gmifOffset = cursor;
            gmifSize = size;
        }
        cursor += size;
    }
    if (btafOffset < 0 || gmifOffset < 0) {
        throw new Error(`NARC archive ${narcPath} is missing BTAF or GMIF chunks.`);
    }
    const fileCount = buffer.readUInt32LE(btafOffset + 8);
    const gmifDataStart = gmifOffset + 8;
    const files = [];
    const magicCounts = new Map();
    for (let index = 0; index < fileCount; index += 1) {
        const entryOffset = btafOffset + 12 + index * 8;
        if (entryOffset + 8 > btafOffset + btafSize) {
            break;
        }
        const start = buffer.readUInt32LE(entryOffset);
        const end = buffer.readUInt32LE(entryOffset + 4);
        const absoluteStart = gmifDataStart + start;
        const absoluteEnd = gmifDataStart + end;
        const slice = buffer.subarray(absoluteStart, absoluteEnd);
        const magic = detectSubfileMagic(slice);
        files.push({
            index,
            start,
            end,
            size: end - start,
            magic,
        });
        magicCounts.set(magic, (magicCounts.get(magic) ?? 0) + 1);
    }
    const magicHistogram = [...magicCounts.entries()]
        .map(([magic, count]) => ({ magic, count }))
        .sort((left, right) => right.count - left.count || left.magic.localeCompare(right.magic));
    return {
        romPath: romInspection.sourcePath,
        romFileName: basename(romInspection.sourcePath),
        romSha256: romInspection.sha256,
        narcPath,
        narcSize: narcEntry.size,
        fileCount,
        chunks,
        files,
        magicHistogram,
    };
}
export function writeRomNarcInspection(outputDir, inspection, options) {
    const archiveId = `${sanitizePath(inspection.narcPath)}-${inspection.romSha256.slice(0, 8)}`;
    const narcDir = join(outputDir, 'rom-narc', archiveId);
    ensureDir(narcDir);
    const manifestPath = join(narcDir, 'manifest.json');
    const filesPath = join(narcDir, 'files.json');
    const summaryPath = join(narcDir, 'summary.md');
    writeJson(manifestPath, {
        romPath: inspection.romPath,
        romFileName: inspection.romFileName,
        romSha256: inspection.romSha256,
        narcPath: inspection.narcPath,
        narcSize: inspection.narcSize,
        fileCount: inspection.fileCount,
        chunks: inspection.chunks,
        magicHistogram: inspection.magicHistogram,
    });
    writeJson(filesPath, inspection.files);
    const summaryLines = [
        '# ROM NARC Inspect',
        '',
        `- ROM: ${inspection.romFileName}`,
        `- NARC path: ${inspection.narcPath}`,
        `- Archive size: ${inspection.narcSize} bytes`,
        `- Subfiles: ${inspection.fileCount}`,
        '',
        '## Chunk layout',
        ...inspection.chunks.map((chunk) => `- ${chunk.id}: offset=${chunk.offset} size=${chunk.size}`),
        '',
        '## Magic histogram',
        ...inspection.magicHistogram.map((entry) => `- ${entry.magic}: ${entry.count}`),
        '',
        '## First files',
        ...inspection.files.slice(0, 20).map((file) => `- #${file.index}: size=${file.size} magic=${file.magic}`),
        '',
    ];
    writeFileSync(summaryPath, summaryLines.join('\n'), 'utf-8');
    let extractedDir = null;
    if (options.extractFiles) {
        extractedDir = join(narcDir, 'files');
        ensureDir(extractedDir);
        const limit = options.extractLimit == null ? inspection.files.length : Math.min(options.extractLimit, inspection.files.length);
        const handle = openSync(inspection.romPath, 'r');
        try {
            const narcEntry = inspectRom(inspection.romPath).filesystem.entries.find((entry) => entry.path === inspection.narcPath);
            if (!narcEntry) {
                throw new Error(`NARC path not found during extraction: ${inspection.narcPath}`);
            }
            const narcBuffer = Buffer.alloc(narcEntry.size);
            const bytesRead = readSync(handle, narcBuffer, 0, narcBuffer.length, narcEntry.offset);
            if (bytesRead !== narcEntry.size) {
                throw new Error(`Expected ${narcEntry.size} bytes for ${inspection.narcPath}, got ${bytesRead}.`);
            }
            const gmifChunk = inspection.chunks.find((chunk) => chunk.id === 'GMIF');
            if (!gmifChunk) {
                throw new Error(`GMIF chunk missing for ${inspection.narcPath}.`);
            }
            const gmifDataStart = gmifChunk.offset + 8;
            for (let index = 0; index < limit; index += 1) {
                const file = inspection.files[index];
                const slice = narcBuffer.subarray(gmifDataStart + file.start, gmifDataStart + file.end);
                const extension = file.magic === 'BIN' || file.magic.startsWith('LZ77') || file.magic === 'EMPTY'
                    ? 'bin'
                    : file.magic.toLowerCase();
                writeFileSync(join(extractedDir, `${String(index).padStart(5, '0')}.${extension}`), slice);
            }
        }
        finally {
            closeSync(handle);
        }
    }
    return {
        narcDir,
        manifestPath,
        filesPath,
        summaryPath,
        extractedDir,
    };
}
