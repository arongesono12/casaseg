// Screenshot + minimal click test for each built direction.
// Usage: PW=<path to playwright-core> node design-demos/src/shoot.cjs "A - Franja fluida.html" ...
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PW);

(async () => {
  const browser = await chromium.launch();
  for (const file of process.argv.slice(2)) {
    const page = await browser.newPage({ viewport: { width: 1860, height: 1000 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const abs = path.join(__dirname, '..', file);
    await page.goto(pathToFileURL(abs).href, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-phone="owner"]', { timeout: 30000 });
    await page.waitForTimeout(1200);
    const shot = abs.replace(/\.html$/, '.png');
    await page.screenshot({ path: shot, fullPage: true });

    const checks = [];
    const explore = page.locator('[data-phone="explore"]');
    await explore.getByText(/Apartamento.*Malabo/).first().click();
    checks.push(['abrir detalle', await explore.getByText(/^(Reservar|Solicitar) visita$/).count() > 0]);
    const detail = page.locator('[data-phone="detail"]');
    await detail.getByText(/^(Reservar|Solicitar) visita$/).first().click();
    await detail.getByText('Enviar solicitud').first().click();
    checks.push(['enviar visita', await detail.getByText(/Solicitud (enviada|registrada)/).count() > 0]);
    const owner = page.locator('[data-phone="owner"]');
    await owner.getByText('Guardados').first().click();
    checks.push(['cambiar tab', await owner.getByText('Villa en Sipopo').count() > 0]);

    console.log(file, '→', path.basename(shot));
    console.log('  checks:', checks.map(([n, ok]) => `${n}:${ok ? 'ok' : 'FAIL'}`).join('  '));
    console.log('  errors:', errors.length ? errors.slice(0, 5) : 0);
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
