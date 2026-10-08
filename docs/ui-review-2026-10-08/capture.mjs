import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const stage = process.argv[2];
if (!['antes', 'despues'].includes(stage)) throw new Error('Use antes or despues');
const scheme = process.argv[3] === 'light' ? 'light' : 'dark';
const outputDir = new URL('./', import.meta.url);
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = join(tmpdir(), `casaseg-ui-review-${process.pid}`);
const port = 20000 + process.pid % 20000;
let browserError = '';
const browser = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
browser.stderr.on('data', (data) => { browserError += String(data).slice(0, 1000); });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json`);
      target = (await response.json()).find((item) => item.type === 'page');
      if (target) break;
    } catch { /* Chrome is starting. */ }
    await delay(200);
  }
  if (!target) throw new Error(`Chrome debugging target unavailable. Exit: ${browser.exitCode}. ${browserError.slice(0, 500)}`);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  const runtimeErrors = [];
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(`${message.params.exceptionDetails?.text}: ${message.params.exceptionDetails?.exception?.description}`);
    if (message.method === 'Log.entryAdded' && message.params.entry?.level === 'error') runtimeErrors.push(message.params.entry.text);
    if (!message.id) return;
    const promise = pending.get(message.id);
    if (!promise) return;
    pending.delete(message.id);
    message.error ? promise.reject(new Error(message.error.message)) : promise.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value;
  const navigate = async (path, expected) => {
    const navigation = await send('Page.navigate', { url: `http://127.0.0.1:19031${path}` });
    let content = '';
    for (let attempt = 0; attempt < 40; attempt++) {
      content = String(await evaluate('document.body?.innerText || ""') || '');
      if (content.includes(expected)) break;
      await delay(500);
    }
    if (!content.includes(expected)) {
      const details = await evaluate('JSON.stringify({url:location.href, ready:document.readyState, html:document.documentElement.outerHTML.slice(0,400)})');
      throw new Error(`${path}: expected ${expected}; found ${content.slice(0, 300)}; navigation=${JSON.stringify(navigation)}; details=${details}; errors=${runtimeErrors.slice(0, 3).join(' | ')}`);
    }
    await delay(700);
    console.log(path, content.slice(0, 220).replaceAll('\n', ' | '));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setLocaleOverride', { locale: 'es-ES' });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
  await navigate('/login', 'Inicia');
  const clicked = await evaluate(`(() => { const button = [...document.querySelectorAll('[role="button"], button')].find((item) => item.textContent?.includes('Entrar como cliente demo')); button?.click(); return Boolean(button); })()`);
  if (!clicked) throw new Error('Demo sign-in button unavailable');
  await delay(1200);
  await mkdir(outputDir, { recursive: true });
  for (const [name, path, expected] of [
    ['perfil', '/profile', 'Aron'],
    ['mensajes', '/messages', 'Equipo CasaSeg'],
    ['guardados', '/saved', stage === 'antes' ? 'No tienes propiedades guardadas' : 'Tu colección empieza aquí'],
  ]) {
    await navigate(path, expected);
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    await writeFile(new URL(`${name}-${stage}${scheme === 'light' ? '-claro' : ''}.png`, outputDir), Buffer.from(result.data, 'base64'));
  }
} finally {
  socket?.close();
  browser.kill();
}
