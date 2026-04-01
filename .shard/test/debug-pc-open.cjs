const { chromium } = require("playwright");

const targetUrl = "http://127.0.0.1:4319";

async function advanceFrames(page, frameCount) {
  for (let index = 0; index < frameCount; index += 1) {
    await page.evaluate(() => {
      if (typeof window.advanceTime === "function") {
        window.advanceTime(1000 / 60);
      }
    });
  }
}

async function move(page, key, frames) {
  await page.keyboard.down(key);
  await advanceFrames(page, frames);
  await page.keyboard.up(key);
  await advanceFrames(page, 2);
}

async function stepMove(page, key) {
  await page.keyboard.down(key);
  await advanceFrames(page, 1);
  await page.keyboard.up(key);

  for (let index = 0; index < 30; index += 1) {
    await advanceFrames(page, 1);
    const state = await readState(page);
    if (state && !state.player.moving) {
      return state;
    }
  }

  return readState(page);
}

async function readState(page) {
  return page.evaluate(() => {
    if (typeof window.render_game_to_text !== "function") {
      return null;
    }
    return JSON.parse(window.render_game_to_text());
  });
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage();

  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => typeof window.render_game_to_text === "function");

  for (let index = 0; index < 4; index += 1) {
    await stepMove(page, "ArrowLeft");
  }
  for (let index = 0; index < 3; index += 1) {
    await stepMove(page, "ArrowUp");
  }

  console.log("state-before", JSON.stringify(await readState(page)));

  await page.keyboard.press("Enter");
  console.log("text-after-1", JSON.stringify(await page.locator("body").innerText()));
  await page.keyboard.press("Enter");
  console.log("text-after-2", JSON.stringify(await page.locator("body").innerText()));
  await page.keyboard.press("Enter");
  console.log("text-after-3", JSON.stringify(await page.locator("body").innerText()));
  await page.keyboard.press("z");
  console.log("text-after-z-1", JSON.stringify(await page.locator("body").innerText()));
  await page.keyboard.press("z");
  console.log("text-after-z-2", JSON.stringify(await page.locator("body").innerText()));
  await page.keyboard.press("z");
  console.log("text-after-z-3", JSON.stringify(await page.locator("body").innerText()));

  await page.screenshot({ path: ".shard/test/debug-pc-open.png", fullPage: true });
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
