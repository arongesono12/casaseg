const fs = require('node:fs');
const path = require('node:path');
const playwright = require(process.env.CODEX_PLAYWRIGHT_PATH || 'playwright');

const baseUrl = process.env.CASASEG_AUDIT_URL || 'http://localhost:8083';
const outputDir = path.join(process.cwd(), 'docs', 'property-fees');

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    for (const variant of [{ width: 320, height: 568, theme: 'light' }, { width: 390, height: 844, theme: 'light' }, { width: 390, height: 844, theme: 'dark' }, { width: 1200, height: 800, theme: 'light' }]) {
      const viewport = { width: variant.width, height: variant.height };
      const page = await browser.newPage({ viewport, colorScheme: variant.theme, deviceScaleFactor: 1, isMobile: variant.width < 900, hasTouch: variant.width < 900 });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(new URL('/property/malabo-modern-1', baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
      const heading = page.getByText('Desglose del precio');
      await heading.waitFor({ timeout: 30000 });
      await heading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const suffix = `${viewport.width}x${viewport.height}${variant.theme === 'dark' ? '-dark' : ''}`;
      const name = `property-fees-${suffix}.png`;
      await page.screenshot({ path: path.join(outputDir, name) });
      if (variant.width >= 900) await heading.locator('..').screenshot({ path: path.join(outputDir, `property-fees-card-${suffix}.png`) });
      await page.getByText('Total inicial estimado').scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(outputDir, `property-fees-total-${suffix}.png`) });
      const labels = await Promise.all(['Servicio', 'Limpieza', 'Impuestos', 'Depósito/fianza', 'Total inicial estimado'].map(async (label) => page.getByText(label, { exact: true }).count()));
      console.log(JSON.stringify({ name, labelsVisible: labels.every(Boolean), errors }));
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
