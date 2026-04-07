const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const repoRoot = process.cwd();
const targetUrl = process.argv[2] || "http://127.0.0.1:4317";
const outputPath = path.join(repoRoot, ".shard", "test", "inspect-sprite-runtime.json");

async function bootBattle(page) {
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
  await page.waitForTimeout(1500);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });

  await bootBattle(page);

  const canvasSnapshotA = await page.evaluate(() =>
    Array.from(document.querySelectorAll("canvas")).map((canvas) => canvas.toDataURL()),
  );
  await page.waitForTimeout(180);
  const canvasSnapshotB = await page.evaluate(() =>
    Array.from(document.querySelectorAll("canvas")).map((canvas) => canvas.toDataURL()),
  );

  const payload = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("*"))
      .map((element) => {
        const style = window.getComputedStyle(element);
        return {
          tag: element.tagName,
          text: element.textContent?.trim() ?? "",
          src: element.tagName === "IMG" ? element.getAttribute("src") : null,
          backgroundImage: style.backgroundImage,
          backgroundColor: style.backgroundColor,
          animation: style.animation,
          left: style.left,
          top: style.top,
          width: style.width,
          height: style.height,
          position: style.position,
          opacity: style.opacity,
        };
      })
      .filter(
        (node) =>
          node.tag === "CANVAS" ||
          (node.src && node.src.includes("/assets/sprites/pokemon")) ||
          (node.backgroundImage && node.backgroundImage.includes("/assets/sprites/pokemon")) ||
          (node.backgroundColor && node.backgroundColor !== "rgba(0, 0, 0, 0)"),
      );

    return {
      nodes,
      bodyText: document.body.innerText,
    };
  });

  payload.canvasChanged = canvasSnapshotA.some((snapshot, index) => snapshot !== canvasSnapshotB[index]);
  payload.canvasCount = canvasSnapshotA.length;

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
