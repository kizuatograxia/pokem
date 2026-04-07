const path = require('path');
const { chromium } = require('playwright');

const out1 = path.join(process.cwd(), '.shard', 'test', 'pc-deposit-1-menu.png');
const out2 = path.join(process.cwd(), '.shard', 'test', 'pc-deposit-2-mode.png');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await page.goto('http://127.0.0.1:4317', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('hub:pc'));
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: out1, fullPage: true });

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // deposit mode
  await page.waitForTimeout(500);
  await page.screenshot({ path: out2, fullPage: true });

  await browser.close();
})();