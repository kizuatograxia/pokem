const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = process.cwd();
const targetUrl = process.argv[2] || "http://127.0.0.1:4317";
const outputPath = path.join(repoRoot, ".shard", "test", "quick-battle-check.json");
const screenshotPath = path.join(repoRoot, ".shard", "test", "quick-battle-check.png");

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
          body.includes("/src/main.tsx") &&
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

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
  const consoleMessages = [];
  const pageErrors = [];
  const requestFailures = [];

  page.on("console", (msg) => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (error) => {
    pageErrors.push(String(error));
  });
  page.on("requestfailed", (request) => {
    requestFailures.push({
      url: request.url(),
      failure: request.failure(),
    });
  });

  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(4000);

  const visibleText = await page.locator("body").innerText();

  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  const payload = {
    targetUrl,
    visibleText,
    consoleMessages,
    pageErrors,
    requestFailures,
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
