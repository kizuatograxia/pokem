import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}
function ensureDir(dir) {
    mkdirSync(dir, { recursive: true });
}
function writeJson(filePath, data) {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}
export function writeRomInspection(outputDir, inspection) {
    const inspectionId = `${slugify(inspection.fileName.replace(/\.nds$/i, ''))}-${inspection.sha256.slice(0, 8)}`;
    const inspectionDir = join(outputDir, 'rom-inspect', inspectionId);
    ensureDir(inspectionDir);
    const manifest = {
        sourcePath: inspection.sourcePath,
        fileName: inspection.fileName,
        fileSize: inspection.fileSize,
        sha256: inspection.sha256,
        md5: inspection.md5,
        inspectedAt: inspection.inspectedAt,
        header: inspection.header,
        banner: inspection.banner,
        filesystem: {
            fileCount: inspection.filesystem.fileCount,
            directoryCount: inspection.filesystem.directoryCount,
        },
        warnings: inspection.warnings,
    };
    const summaryLines = [
        '# ROM Inspect',
        '',
        `- File: ${inspection.fileName}`,
        `- Source: ${inspection.sourcePath}`,
        `- Size: ${inspection.fileSize} bytes`,
        `- SHA-256: ${inspection.sha256}`,
        `- MD5: ${inspection.md5}`,
        `- Title: ${inspection.header.title}`,
        `- Game code: ${inspection.header.gameCode}`,
        `- Maker code: ${inspection.header.makerCode}`,
        `- ROM version: ${inspection.header.romVersion}`,
        `- Declared ROM size: ${inspection.header.romSizeDeclared}`,
        `- Files in NitroFS: ${inspection.filesystem.fileCount}`,
        `- Directories in NitroFS: ${inspection.filesystem.directoryCount}`,
        '',
    ];
    if (inspection.banner?.titles.english) {
        summaryLines.push('## Banner');
        summaryLines.push(`- English: ${inspection.banner.titles.english}`);
        summaryLines.push('');
    }
    if (inspection.warnings.length > 0) {
        summaryLines.push('## Warnings');
        for (const warning of inspection.warnings) {
            summaryLines.push(`- ${warning}`);
        }
        summaryLines.push('');
    }
    const manifestPath = join(inspectionDir, 'manifest.json');
    const filesystemPath = join(inspectionDir, 'filesystem.json');
    const summaryPath = join(inspectionDir, 'summary.md');
    writeJson(manifestPath, manifest);
    writeJson(filesystemPath, inspection.filesystem);
    writeFileSync(summaryPath, summaryLines.join('\n'), 'utf-8');
    return {
        inspectionDir,
        manifestPath,
        filesystemPath,
        summaryPath,
    };
}
export function printRomInspectionSummary(inspection) {
    console.log('\n=== ROM INSPECT ===\n');
    console.log(`File:        ${inspection.fileName}`);
    console.log(`Title:       ${inspection.header.title}`);
    console.log(`Game code:   ${inspection.header.gameCode}`);
    console.log(`Maker code:  ${inspection.header.makerCode}`);
    console.log(`ROM version: ${inspection.header.romVersion}`);
    console.log(`SHA-256:     ${inspection.sha256}`);
    console.log(`NitroFS:     ${inspection.filesystem.fileCount} files in ${inspection.filesystem.directoryCount} directories`);
    if (inspection.banner?.titles.english) {
        console.log(`Banner EN:   ${inspection.banner.titles.english}`);
    }
    if (inspection.warnings.length > 0) {
        console.log('');
        console.log('Warnings:');
        for (const warning of inspection.warnings) {
            console.log(`  - ${warning}`);
        }
    }
    console.log('');
}
