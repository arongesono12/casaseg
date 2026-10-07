const fs = require('node:fs');
const path = require('node:path');

const playwright = require(process.env.CODEX_PLAYWRIGHT_PATH || 'playwright');
const baseUrl = process.env.CASASEG_AUDIT_URL || 'http://localhost:8081';
const phase = process.argv[2] || 'before';
const outputDir = path.join(process.cwd(), 'docs', 'ui-audit', phase);

async function capture(browser, route, name, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(new URL(route, baseUrl).toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true });
  const size = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportHeight: document.documentElement.clientHeight,
    documentHeight: document.documentElement.scrollHeight,
  }));
  console.log(JSON.stringify({ name, url: page.url(), size, errors: errors.slice(0, 2) }));
  if (phase === 'after' && name === 'explore-320x568') {
    const studios = page.getByRole('tab', { name: 'Estudios' });
    await studios.scrollIntoViewIfNeeded();
    await studios.click();
    const selected = await studios.evaluate((element) => ({ ariaSelected: element.getAttribute('aria-selected'), borderColor: getComputedStyle(element).borderBottomColor }));
    const map = page.getByRole('button', { name: 'Mapa', exact: true });
    const mapSize = await map.boundingBox();
    await map.click();
    await page.waitForURL(/\/map(?:\?|$)/, { timeout: 10000 });
    console.log(JSON.stringify({ interaction: name, studiosSelected: selected, mapTouchTarget: mapSize && { width: mapSize.width, height: mapSize.height }, mapRoute: new URL(page.url()).pathname }));
  }
  if (phase === 'after' && name === 'map-390x844') {
    await page.getByRole('button', { name: 'Ver lista' }).click();
    await page.waitForURL(/\/explore(?:\?|$)/, { timeout: 10000 });
    console.log(JSON.stringify({ interaction: name, listRoute: new URL(page.url()).pathname }));
  }
  await context.close();
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await playwright.chromium.launch({ headless: true });
  try {
    await capture(browser, '/explore', 'explore-390x844', { width: 390, height: 844 });
    await capture(browser, '/explore', 'explore-320x568', { width: 320, height: 568 });
    await capture(browser, '/saved', 'saved-390x844', { width: 390, height: 844 });
    await capture(browser, '/messages', 'messages-390x844', { width: 390, height: 844 });
    await capture(browser, '/profile', 'profile-390x844', { width: 390, height: 844 });
    await capture(browser, '/login', 'login-390x844', { width: 390, height: 844 });
    await capture(browser, '/property/malabo-modern-1', 'property-320x568', { width: 320, height: 568 });
    await capture(browser, '/map', 'map-390x844', { width: 390, height: 844 });
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
