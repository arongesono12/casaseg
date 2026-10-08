import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const scheme = process.argv[2] === 'light' ? 'light' : 'dark';
const port = 22000 + process.pid % 20000;
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${join(tmpdir(), `casaseg-profile-edit-${process.pid}`)}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((item) => item.type === 'page');
      if (target) break;
    } catch { /* Chrome is starting. */ }
    await pause(200);
  }
  if (!target) throw new Error('Chrome did not start');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    message.error ? entry.reject(new Error(message.error.message)) : entry.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value;
  const waitFor = async (expression, label) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await pause(300);
    }
    throw new Error(`Timed out waiting for ${label}: ${String(await evaluate('document.body?.innerText || ""')).slice(0, 300)}`);
  };
  const click = async (label) => {
    const found = await evaluate(`(() => { const target = [...document.querySelectorAll('[role="button"], button')].find((element) => element.textContent?.trim() === ${JSON.stringify(label)}); target?.scrollIntoView({ block: 'center' }); target?.click(); return Boolean(target); })()`);
    if (!found) throw new Error(`Button unavailable: ${label}`);
  };
  const capture = async (name) => {
    await pause(450);
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    await writeFile(new URL(`${name}${scheme === 'light' ? '-claro' : ''}.png`, import.meta.url), Buffer.from(result.data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
  await send('Page.navigate', { url: 'http://127.0.0.1:19031/login' });
  await waitFor(`document.body?.innerText.includes('Entrar como cliente demo')`, 'demo login');
  await click('Entrar como cliente demo');
  await pause(800);
  await send('Page.navigate', { url: 'http://127.0.0.1:19031/profile' });
  await waitFor(`document.body?.innerText.includes('Editar perfil')`, 'profile view');
  await mkdir(new URL('./', import.meta.url), { recursive: true });
  await evaluate(`[...document.querySelectorAll('[role="button"]')].find((element) => element.textContent?.trim() === 'Editar perfil')?.scrollIntoView({ block: 'center' })`);
  await capture('perfil-vista');

  await click('Editar perfil');
  await waitFor(`Boolean(document.querySelector('input[placeholder="+240 222 000 000"]'))`, 'phone editor');
  await capture('perfil-edicion');
  await evaluate(`document.querySelector('input[placeholder="+240 222 000 000"]').focus()`);
  await send('Input.insertText', { text: '222 000 000' });
  await click('Cancelar');
  await waitFor(`document.body?.innerText.includes('Editar perfil')`, 'cancelled editor');
  await click('Editar perfil');
  await waitFor(`Boolean(document.querySelector('input[placeholder="+240 222 000 000"]'))`, 'reopened editor');
  if (await evaluate(`document.querySelector('input[placeholder="+240 222 000 000"]').value`) !== '') throw new Error('Cancelled phone draft was retained');
  await evaluate(`document.querySelector('input[placeholder="+240 222 000 000"]').focus()`);
  await send('Input.insertText', { text: '+240 222 123 456' });
  await click('Guardar cambios');
  await waitFor(`document.body?.innerText.includes('+240 222 123 456') && document.body?.innerText.includes('Editar perfil')`, 'saved phone');
  await capture('perfil-telefono-guardado');

  await send('Page.navigate', { url: 'http://127.0.0.1:19031/profile' });
  await waitFor(`document.body?.innerText.includes('+240 222 123 456')`, 'persisted phone after reload');
  console.log('Profile view, cancel, edit, save and reload succeeded.');
} finally {
  socket?.close();
  browser.kill();
}
