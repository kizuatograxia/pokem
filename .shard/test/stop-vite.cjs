const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const pidPath = path.join(repoRoot, ".shard", "test", "vite-hub.pid");

if (!fs.existsSync(pidPath)) {
  process.exit(0);
}

const pid = Number(fs.readFileSync(pidPath, "utf8").trim());

if (Number.isFinite(pid) && pid > 0) {
  try {
    process.kill(pid);
  } catch (error) {
    if (error && error.code !== "ESRCH") {
      throw error;
    }
  }
}

fs.rmSync(pidPath, { force: true });
