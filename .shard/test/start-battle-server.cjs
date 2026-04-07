const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const serverDir = path.join(repoRoot, "server", "battle");
const logPath = path.join(repoRoot, ".shard", "test", "battle-server.log");
const pidPath = path.join(repoRoot, ".shard", "test", "battle-server.pid");
const nodeCommand = "C:\\PROGRA~1\\nodejs\\node.exe";

fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, "");
const outFd = fs.openSync(logPath, "a");

const child = spawn(nodeCommand, [path.join(serverDir, "dist", "gateway", "server.js")], {
  cwd: repoRoot,
  detached: true,
  stdio: ["ignore", outFd, outFd],
  windowsHide: true,
});

fs.writeFileSync(pidPath, String(child.pid));
child.unref();

console.log(JSON.stringify({ pid: child.pid, logPath }));
