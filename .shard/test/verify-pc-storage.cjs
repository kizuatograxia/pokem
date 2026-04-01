const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = process.cwd();
const targetUrl = "http://127.0.0.1:4319";
const outputPath = path.join(repoRoot, ".shard", "test", "pc-storage-check.json");
const screenshotPath = path.join(repoRoot, ".shard", "test", "pc-storage-check.png");

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

async function press(page, key) {
  await page.keyboard.press(key);
  await page.waitForTimeout(120);
}

async function pageText(page) {
  return page.locator("body").innerText();
}

async function readState(page) {
  const stateText = await page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      return null;
    }

    return window.render_game_to_text();
  });

  return stateText ? JSON.parse(stateText) : null;
}

async function readPreviewImages(page) {
  return page.evaluate(() =>
    Array.from(document.images)
      .filter((image) =>
        image.src.includes("CHARIZARD.png") || image.src.includes("PIKACHU.png") || image.src.includes("VENUSAUR.png"),
      )
      .map((image) => ({
        src: image.getAttribute("src"),
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        left: image.getBoundingClientRect().left,
        top: image.getBoundingClientRect().top,
        width: image.getBoundingClientRect().width,
        height: image.getBoundingClientRect().height,
      })),
  );
}

async function waitForText(page, expectedText) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    const text = await pageText(page);
    if (text.includes(expectedText)) {
      return text;
    }
    await page.waitForTimeout(100);
  }

  throw new Error(`Timed out waiting for text: ${expectedText}`);
}

async function main() {
  await waitForServer();

  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
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
  await press(page, "Enter");
  await press(page, "ArrowDown");
  await press(page, "Enter");
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");

  for (let index = 0; index < 4; index += 1) {
    await move(page, "ArrowLeft", 13);
  }

  for (let index = 0; index < 3; index += 1) {
    await move(page, "ArrowUp", 13);
  }

  await press(page, "Enter");
  await press(page, "Enter");
  await press(page, "Enter");
  const menuText = await waitForText(page, "BILL'S PC");

  await press(page, "Enter");
  const organizeText = await waitForText(page, "Party: 3");

  await press(page, "Enter");
  const organizeHeldText = await waitForText(page, "Venusaur was selected.");

  await press(page, "KeyX");
  await press(page, "KeyX");
  await waitForText(page, "BILL'S PC");

  await press(page, "ArrowDown");
  await press(page, "Enter");
  const withdrawBeforeText = await waitForText(page, "Party: 3");

  await press(page, "Enter");
  const withdrawAfterText = await waitForText(page, "Party: 4");

  await press(page, "KeyX");
  await waitForText(page, "BILL'S PC");

  await press(page, "ArrowDown");
  await press(page, "Enter");
  const depositBeforeText = await waitForText(page, "Party: 4");

  await press(page, "Enter");
  const depositAfterText = await waitForText(page, "Party: 3");
  await page.waitForTimeout(1500);
  const previewImages = await readPreviewImages(page);

  await page.screenshot({ path: screenshotPath, fullPage: true });
  await browser.close();

  const payload = {
    menuText,
    organizeText,
    organizeHeldText,
    withdrawBeforeText,
    withdrawAfterText,
    depositBeforeText,
    depositAfterText,
    previewImages,
    consoleErrors,
    assertions: {
      menuOpened: menuText.includes("BILL'S PC") && menuText.includes("ORGANIZE BOXES"),
      organizeOpened: organizeText.includes("Party: 3"),
      organizePickWorked: organizeHeldText.includes("Venusaur was selected."),
      withdrawRaisedPartyCount: withdrawBeforeText.includes("Party: 3") && withdrawAfterText.includes("Party: 4"),
      depositLoweredPartyCount: depositBeforeText.includes("Party: 4") && depositAfterText.includes("Party: 3"),
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
