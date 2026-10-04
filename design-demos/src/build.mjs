// Assembles each direction into a self-contained HTML (double-click to open; images stay in ../img).
// Usage: node design-demos/src/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const read = (p) => readFileSync(join(here, p), 'utf8');

const logoSource = readFileSync(join(root, 'src/components/ui/casaseg-logo.tsx'), 'utf8');
const logoPaths = [...logoSource.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
if (logoPaths.length !== 3) throw new Error(`Expected 3 logo paths, found ${logoPaths.length}`);

const frame = read('00-ios-frame.jsx');
const shared = read('01-shared.jsx').replace('__LOGO_PATHS__', JSON.stringify(logoPaths));

const directions = [
  { src: 'a-fluid.jsx', out: 'A - Franja fluida.html', title: 'CasaSeg · A · Franja fluida' },
  { src: 'b-airbnb.jsx', out: 'B - Foto primero.html', title: 'CasaSeg · B · Foto primero' },
  { src: 'c-folio.jsx', out: 'C - Folio registral.html', title: 'CasaSeg · C · Folio registral' },
];

for (const d of directions) {
  let body;
  try { body = read(d.src); } catch { continue; }
  const fonts = (body.match(/^\/\/ FONTS: (.+)$/m) || [])[1] || '';
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${d.title}</title>
${fonts ? `<link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin /><link rel="stylesheet" href="${fonts}" />` : ''}
<style>html,body{margin:0}*{box-sizing:border-box}button{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer}button:focus-visible{outline:3px solid rgba(37,99,235,.45);outline-offset:2px}::-webkit-scrollbar{display:none}</style>
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
${frame}
${shared}
${body}
ReactDOM.createRoot(document.getElementById('root')).render(<Board {...DIRECTION} />);
</script>
</body>
</html>
`;
  writeFileSync(join(here, '..', d.out), html);
  console.log('built', d.out);
}
