import { createHash } from 'crypto';
import { basename, resolve } from 'path';
import { readFileSync, statSync } from 'fs';

export interface RomSection {
  offset: number;
  size: number;
  end: number;
}

export interface RomHeader {
  title: string;
  gameCode: string;
  makerCode: string;
  unitCode: number;
  encryptionSeed: number;
  deviceCapacityCode: number;
  declaredCapacityBytes: number;
  romVersion: number;
  autoStartFlag: number;
  arm9: RomSection & { entryAddress: number; ramAddress: number };
  arm7: RomSection & { entryAddress: number; ramAddress: number };
  fileNameTable: RomSection;
  fileAllocationTable: RomSection;
  arm9OverlayTable: RomSection;
  arm7OverlayTable: RomSection;
  iconBannerOffset: number;
  secureAreaChecksum: number;
  secureTransferDelay: number;
  arm9AutoLoadAddress: number;
  arm7AutoLoadAddress: number;
  romSizeDeclared: number;
  headerSize: number;
}

export interface RomBanner {
  version: number;
  titles: Record<string, string>;
}

export interface RomFileEntry {
  id: number;
  path: string;
  offset: number;
  size: number;
}

export interface RomFilesystem {
  fileCount: number;
  directoryCount: number;
  entries: RomFileEntry[];
}

export interface RomInspectionResult {
  sourcePath: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  md5: string;
  inspectedAt: string;
  header: RomHeader;
  banner: RomBanner | null;
  filesystem: RomFilesystem;
  warnings: string[];
}

function readAscii(buffer: Buffer, offset: number, length: number) {
  return buffer.toString('ascii', offset, offset + length).replace(/\0+$/g, '').trim();
}

function readUtf16(buffer: Buffer, offset: number, byteLength: number) {
  return buffer
    .toString('utf16le', offset, offset + byteLength)
    .replace(/\0+$/g, '')
    .replace(/\u0000/g, '')
    .trim();
}

function readSection(buffer: Buffer, offset: number): RomSection {
  const start = buffer.readUInt32LE(offset);
  const size = buffer.readUInt32LE(offset + 4);
  return {
    offset: start,
    size,
    end: start + size,
  };
}

function readExecutableSection(buffer: Buffer, offset: number) {
  const sectionOffset = buffer.readUInt32LE(offset);
  const entryAddress = buffer.readUInt32LE(offset + 4);
  const ramAddress = buffer.readUInt32LE(offset + 8);
  const size = buffer.readUInt32LE(offset + 12);
  return {
    offset: sectionOffset,
    entryAddress,
    ramAddress,
    size,
    end: sectionOffset + size,
  };
}

function parseHeader(buffer: Buffer): RomHeader {
  return {
    title: readAscii(buffer, 0x00, 12),
    gameCode: readAscii(buffer, 0x0c, 4),
    makerCode: readAscii(buffer, 0x10, 2),
    unitCode: buffer.readUInt8(0x12),
    encryptionSeed: buffer.readUInt8(0x13),
    deviceCapacityCode: buffer.readUInt8(0x14),
    declaredCapacityBytes: 128 * 1024 * (2 ** buffer.readUInt8(0x14)),
    romVersion: buffer.readUInt8(0x1e),
    autoStartFlag: buffer.readUInt8(0x1f),
    arm9: readExecutableSection(buffer, 0x20),
    arm7: readExecutableSection(buffer, 0x30),
    fileNameTable: readSection(buffer, 0x40),
    fileAllocationTable: readSection(buffer, 0x48),
    arm9OverlayTable: readSection(buffer, 0x50),
    arm7OverlayTable: readSection(buffer, 0x58),
    iconBannerOffset: buffer.readUInt32LE(0x68),
    secureAreaChecksum: buffer.readUInt16LE(0x6c),
    secureTransferDelay: buffer.readUInt16LE(0x6e),
    arm9AutoLoadAddress: buffer.readUInt32LE(0x70),
    arm7AutoLoadAddress: buffer.readUInt32LE(0x74),
    romSizeDeclared: buffer.readUInt32LE(0x80),
    headerSize: buffer.readUInt32LE(0x84),
  };
}

function parseBanner(buffer: Buffer, offset: number): RomBanner | null {
  if (!offset || offset >= buffer.length || offset + 0x840 > buffer.length) {
    return null;
  }

  const version = buffer.readUInt16LE(offset);
  const titleOffset = offset + 0x240;
  const titles = {
    japanese: readUtf16(buffer, titleOffset + 0x000, 0x100),
    english: readUtf16(buffer, titleOffset + 0x100, 0x100),
    french: readUtf16(buffer, titleOffset + 0x200, 0x100),
    german: readUtf16(buffer, titleOffset + 0x300, 0x100),
    italian: readUtf16(buffer, titleOffset + 0x400, 0x100),
    spanish: readUtf16(buffer, titleOffset + 0x500, 0x100),
  };

  return {
    version,
    titles: Object.fromEntries(Object.entries(titles).filter(([, value]) => value.length > 0)),
  };
}

function joinNitroPath(parent: string, name: string) {
  return parent.length > 0 ? `${parent}/${name}` : name;
}

function parseFilesystem(buffer: Buffer, header: RomHeader, warnings: string[]): RomFilesystem {
  const { fileNameTable, fileAllocationTable } = header;

  if (fileNameTable.size === 0 || fileAllocationTable.size === 0) {
    warnings.push('ROM does not expose a NitroFS file table.');
    return { fileCount: 0, directoryCount: 0, entries: [] };
  }

  if (
    fileNameTable.offset >= buffer.length ||
    fileAllocationTable.offset >= buffer.length ||
    fileNameTable.end > buffer.length ||
    fileAllocationTable.end > buffer.length
  ) {
    warnings.push('FNT/FAT section points outside the ROM file.');
    return { fileCount: 0, directoryCount: 0, entries: [] };
  }

  const directoryCount = buffer.readUInt16LE(fileNameTable.offset + 6);
  if (directoryCount <= 0) {
    warnings.push('Root directory count is invalid.');
    return { fileCount: 0, directoryCount: 0, entries: [] };
  }

  const fatEntries: Array<{ start: number; end: number }> = [];
  for (let cursor = fileAllocationTable.offset; cursor < fileAllocationTable.end; cursor += 8) {
    fatEntries.push({
      start: buffer.readUInt32LE(cursor),
      end: buffer.readUInt32LE(cursor + 4),
    });
  }

  const entries: RomFileEntry[] = [];
  const visitedDirectories = new Set<number>();

  const walkDirectory = (dirIndex: number, parentPath: string) => {
    if (visitedDirectories.has(dirIndex) || dirIndex < 0 || dirIndex >= directoryCount) {
      return;
    }
    visitedDirectories.add(dirIndex);

    const recordOffset = fileNameTable.offset + dirIndex * 8;
    const subTableOffset = buffer.readUInt32LE(recordOffset);
    const firstFileId = buffer.readUInt16LE(recordOffset + 4);
    let fileId = firstFileId;
    let cursor = fileNameTable.offset + subTableOffset;

    while (cursor < fileNameTable.end) {
      const control = buffer.readUInt8(cursor);
      cursor += 1;

      if (control === 0) {
        break;
      }

      const isDirectory = (control & 0x80) !== 0;
      const nameLength = control & 0x7f;
      const name = readAscii(buffer, cursor, nameLength);
      cursor += nameLength;

      if (isDirectory) {
        const childDirectoryId = buffer.readUInt16LE(cursor);
        cursor += 2;
        walkDirectory(childDirectoryId - 0xf000, joinNitroPath(parentPath, name));
        continue;
      }

      const fatEntry = fatEntries[fileId];
      if (!fatEntry) {
        warnings.push(`Missing FAT entry for file id ${fileId} (${joinNitroPath(parentPath, name)}).`);
      } else {
        entries.push({
          id: fileId,
          path: joinNitroPath(parentPath, name),
          offset: fatEntry.start,
          size: fatEntry.end - fatEntry.start,
        });
      }
      fileId += 1;
    }
  };

  walkDirectory(0, '');
  entries.sort((left, right) => left.path.localeCompare(right.path));

  return {
    fileCount: entries.length,
    directoryCount,
    entries,
  };
}

export function inspectRom(romPath: string): RomInspectionResult {
  const sourcePath = resolve(romPath);
  const stats = statSync(sourcePath);
  const buffer = readFileSync(sourcePath);

  if (buffer.length < 0x200) {
    throw new Error(`ROM file is too small to be a valid NDS image: ${sourcePath}`);
  }

  const header = parseHeader(buffer);
  const warnings: string[] = [];

  if (header.headerSize === 0 || header.headerSize > buffer.length) {
    warnings.push(`Header size looks invalid: ${header.headerSize} bytes.`);
  }

  if (header.romSizeDeclared > buffer.length) {
    warnings.push(
      `Declared ROM size (${header.romSizeDeclared}) is larger than the actual file size (${buffer.length}).`
    );
  }

  const banner = parseBanner(buffer, header.iconBannerOffset);
  const filesystem = parseFilesystem(buffer, header, warnings);

  return {
    sourcePath,
    fileName: basename(sourcePath),
    fileSize: stats.size,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    md5: createHash('md5').update(buffer).digest('hex'),
    inspectedAt: new Date().toISOString(),
    header,
    banner,
    filesystem,
    warnings,
  };
}
