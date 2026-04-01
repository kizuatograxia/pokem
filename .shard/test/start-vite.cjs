const { spawn } = require("child_process");
const fs = require("fs");
const http = require("http");
const path = require("path");

const repoRoot = process.cwd();
const webDir = path.join(repoRoot, "client", "web");
const logPath = path.join(repoRoot, ".shard", "test", "vite-hub.log");
const pidPath = path.join(repoRoot, ".shard", "test", "vite-hub.pid");
const timeoutMs = 30000;
const systemRoot = process.env.SystemRoot || "C:\\Windows";
const commandHost = process.env.ComSpec || path.join(systemRoot, "System32", "cmd.exe");
const npmCommand = "C:\\Program Files\\nodejs\\npm.cmd";
const portArg = Number(process.argv[2]);
const port = Number.isFinite(portArg) && portArg > 0 ? portArg : 4317;
const targetUrl = `http://127.0.0.1:${port}`;

fs.mkdirSync(path.dirname(logPath), { recursive: true });
fs.writeFileSync(logPath, "");
const command = `"${npmCommand}" run dev -- --host 127.0.0.1 --port ${port} >> "${logPath}" 2>&1`;
const child = spawn(commandHost, ["/d", "/s", "/c", command], {
  cwd: webDir,
  detached: true,
  stdio: "ignore",
  windowsHide: true,
});

fs.writeFileSync(pidPath, String(child.pid));
child.unref();

function probe() {
  return new Promise((resolve, reject) => {
    const request = http.get(targetUrl, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.resume();
      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
        response.on("end", () => {
          if (body.includes('/src/main.tsx') && body.includes('<div id="root"></div>')) {
            resolve();
            return;
          }

          reject(new Error("Unexpected response body"));
        });
      } else {
        reject(new Error(`Unexpected status: ${response.statusCode}`));
      }
    });

    request.on("error", reject);
    request.setTimeout(2000, () => {
      request.destroy(new Error("Timed out waiting for Vite"));
    });
  });
}

async function waitForServer() {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      await probe();
      console.log(JSON.stringify({ pid: child.pid, url: targetUrl }));
      return;
    } catch (_error) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Vite did not respond within ${timeoutMs}ms`);
}

waitForServer().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
