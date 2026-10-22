// Full-page desktop and mobile screenshots of a running site, for design review and QA.
//
//   node scripts/screenshots.mjs [baseUrl] [path ...]
//   node scripts/screenshots.mjs http://localhost:4321 / /speakers
//
// Writes screenshots/<page>-desktop.png and screenshots/<page>-mobile.png.
// Needs Chromium once: npx playwright install chromium
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const [base = 'http://localhost:4321', ...args] = process.argv.slice(2);
const paths = args.length > 0 ? args : ['/', '/speakers'];
const viewports = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();
for (const path of paths) {
  const name = path.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home';
  for (const [device, options] of Object.entries(viewports)) {
    // Reduced motion so scroll-reveal sections are visible in full-page captures.
    const page = await browser.newPage({ ...options, reducedMotion: 'reduce' });
    await page.goto(new URL(path, base).href, { waitUntil: 'networkidle' });
    // Scroll through once so lazy-loaded images load.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle');
    const file = `screenshots/${name}-${device}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.close();
  }
}
await browser.close();
