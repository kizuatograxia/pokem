const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const essentialsRoot = path.join(repoRoot, "pokemon-essentials-v21.1-gen9", "Graphics");
const webAssetsRoot = path.join(repoRoot, "client", "web", "public", "assets", "essentials");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(relativeSourcePath, relativeDestPath) {
  const sourcePath = path.join(essentialsRoot, ...relativeSourcePath);
  const destPath = path.join(webAssetsRoot, ...relativeDestPath);
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(sourcePath, destPath);
}

function copyDirectory(relativeSourcePath, relativeDestPath) {
  const sourceDir = path.join(essentialsRoot, ...relativeSourcePath);
  const destDir = path.join(webAssetsRoot, ...relativeDestPath);
  ensureDir(destDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    fs.copyFileSync(path.join(sourceDir, entry.name), path.join(destDir, entry.name));
  }
}

copyFile(["Characters", "Followers", "PIKACHU.png"], ["characters", "followers", "PIKACHU.png"]);
copyFile(["UI", "Battle", "icon_statuses.png"], ["ui", "battle", "icon_statuses.png"]);
copyFile(["UI", "statuses.png"], ["ui", "statuses.png"]);
copyDirectory(["UI", "Summary"], ["ui", "summary"]);
