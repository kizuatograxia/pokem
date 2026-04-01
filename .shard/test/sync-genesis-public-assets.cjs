const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const sourceRoot = path.join(repoRoot, "client", "genesis", "public", "assets");
const targetRoot = path.join(repoRoot, "client", "web", "public", "assets");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyTree(sourceDir, targetDir) {
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyTree(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

copyTree(sourceRoot, targetRoot);
