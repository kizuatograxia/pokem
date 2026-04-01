const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = process.cwd();
const targetUrl = "http://127.0.0.1:4317";
const outputPath = path.join(repoRoot, ".shard", "test", "hub-run-check.json");
const screenshotPath = path.join(repoRoot, ".shard", "test", "hub-run-check.png");

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

async function advanceFrames(page, frameCount) {
  for (let index = 0; index < frameCount; index += 1) {
    await page.evaluate(() => {
      if (typeof window.advanceTime === "function") {
        window.advanceTime(1000 / 60);
      }
    });
  }
}

async function readState(page) {
  const stateText = await page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      return null;
    }

    return window.render_game_to_text();
  });

  if (stateText === null) {
    throw new Error("render_game_to_text is not available");
  }

  return JSON.parse(stateText);
}

async function move(page, key, frames, modifiers = []) {
  for (const modifier of modifiers) {
    await page.keyboard.down(modifier);
  }
  await page.keyboard.down(key);
  await advanceFrames(page, frames);
  await page.keyboard.up(key);
  for (const modifier of [...modifiers].reverse()) {
    await page.keyboard.up(modifier);
  }
  await advanceFrames(page, 2);
}

async function main() {
  await waitForServer();

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage();
  const consoleErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ type: "console.error", text: msg.text() });
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push({ type: "pageerror", text: String(error) });
  });

  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter");

  await page.waitForFunction(() => typeof window.render_game_to_text === "function");

  const initialState = await readState(page);

  await move(page, "ArrowRight", 13);
  const walkState = await readState(page);

  await move(page, "ArrowRight", 8, ["Shift"]);
  const runState = await readState(page);

  await move(page, "ArrowUp", 13);
  await move(page, "ArrowUp", 13);
  await move(page, "ArrowUp", 13);

  const beforeBlockedState = await readState(page);
  await move(page, "ArrowUp", 13);
  const blockedState = await readState(page);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  const payload = {
    initialState,
    walkState,
    runState,
    beforeBlockedState,
    blockedState,
    consoleErrors,
    assertions: {
      walkMovedOneTileRight: walkState.player.tileX === initialState.player.tileX + 1,
      runMovedOneTileRight: runState.player.tileX === walkState.player.tileX + 1,
      runStayedInSameRow: runState.player.tileY === walkState.player.tileY,
      blockedAtLobbyCounter:
        beforeBlockedState.player.tileX === 12 &&
        beforeBlockedState.player.tileY === 9 &&
        blockedState.player.tileX === 12 &&
        blockedState.player.tileY === 9,
      facingPersistsAfterBlockedMove: blockedState.player.facing === "up",
      noConsoleErrors: consoleErrors.length === 0,
    },
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));

  const failedAssertions = Object.entries(payload.assertions)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  if (failedAssertions.length > 0) {
    throw new Error(`Assertions failed: ${failedAssertions.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
