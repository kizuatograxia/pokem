const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const repoRoot = process.cwd();
const targetUrl = "http://127.0.0.1:4317";
const runnerPath = path.join(
  "C:\\Users\\hedge\\.codex\\skills\\develop-web-game\\scripts",
  "web_game_playwright_client.js",
);
const actionsPath = process.argv[2]
  ? path.resolve(repoRoot, process.argv[2])
  : path.join(repoRoot, ".shard", "test", "hub-actions.json");
const screenshotDir = process.argv[3]
  ? path.resolve(repoRoot, process.argv[3])
  : path.join(repoRoot, ".shard", "test", "playwright-output-4317");
const npxCommand = "C:\\Program Files\\nodejs\\npx.cmd";

function probe() {
  return new Promise((resolve, reject) => {
    const request = http.get(targetUrl, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (
          response.statusCode &&
          response.statusCode >= 200 &&
          response.statusCode < 500 &&
          body.includes('/src/main.tsx') &&
          body.includes('<div id="root"></div>')
        ) {
          resolve();
          return;
        }

        reject(new Error(`Unexpected response: ${response.statusCode}`));
      });
    });

    request.on("error", reject);
    request.setTimeout(2000, () => {
      request.destroy(new Error("Timed out waiting for Vite"));
    });
  });
}

async function waitForServer() {
  const timeoutMs = 30000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      await probe();
      return;
    } catch (_error) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error(`Vite did not respond within ${timeoutMs}ms`);
}

async function main() {
  await waitForServer();

  const command = `"${npxCommand}" -y -p playwright node "${runnerPath}" --url ${targetUrl} --actions-file "${actionsPath}" --iterations 1 --pause-ms 300 --screenshot-dir "${screenshotDir}"`;
  const child = spawn(command, {
    cwd: repoRoot,
    stdio: "inherit",
    windowsHide: true,
    shell: true,
  });

  await new Promise((resolve, reject) => {
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Playwright runner exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
