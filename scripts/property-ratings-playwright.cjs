const path = require('node:path');
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const variant of [{ width: 320, height: 568, theme: 'light' }, { width: 390, height: 844, theme: 'dark' }]) {
      const page = await browser.newPage({ viewport: { width: variant.width, height: variant.height }, colorScheme: variant.theme, hasTouch: true });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('http://localhost:8083/property/malabo-modern-1', { waitUntil: 'domcontentloaded' });
      const title = page.getByText('Valora esta vivienda', { exact: true });
      await title.waitFor({ timeout: 60000 });
      await title.scrollIntoViewIfNeeded();
      const button = page.getByRole('button', { name: 'Inicia sesión para valorar', exact: true });
      await button.scrollIntoViewIfNeeded();
      const bounds = await button.boundingBox();
      if (!bounds || bounds.width < 44 || bounds.height < 44 || bounds.x < 0 || bounds.x + bounds.width > variant.width) throw new Error('Invalid touch target');
      await page.screenshot({ path: path.join('docs', 'property-ratings', `guest-${variant.width}x${variant.height}-${variant.theme}.png`) });
      await button.click();
      await page.waitForURL('**/login', { timeout: 15000 });
      if (errors.length) throw new Error(errors.join('\n'));
      console.log(JSON.stringify({ viewport: variant, touchTarget: bounds, loginNavigation: true, pageErrors: errors }));
      await page.close();
    }
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
