// NativeTabs takes image sources, so rasterize the original Hugeicons vectors.
// Set CASASEG_SHARP_MODULE to a local sharp installation to regenerate.
/* global __dirname */
const { Buffer } = require('node:buffer');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.CASASEG_SHARP_MODULE || 'sharp');
const destination = path.join(__dirname, '..', 'assets', 'icons', 'hugeicons');
const icons = { explore: 'Navigation05Icon', saved: 'FavouriteIcon', messages: 'Message02Icon', profile: 'UserCircleIcon' };

(async () => {
  fs.mkdirSync(destination, { recursive: true });
  for (const [name, moduleName] of Object.entries(icons)) {
    const nodes = require(`@hugeicons/core-free-icons/${moduleName}`);
    for (const selected of [false, true]) {
      const markup = nodes.map(([tag, values]) => {
        const attributes = Object.entries(values).filter(([key]) => key !== 'key').map(([key, value]) => {
          const attribute = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
          const resolved = key === 'strokeWidth' && selected ? '2' : String(value).replaceAll('currentColor', '#000');
          return `${attribute}="${resolved}"`;
        }).join(' ');
        return `<${tag} ${attributes}/>`;
      }).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${name === 'saved' && selected ? '#000' : 'none'}">${markup}</svg>`;
      for (const scale of [1, 2, 3]) {
        const suffix = scale === 1 ? '' : `@${scale}x`;
        await sharp(Buffer.from(svg), { density: 72 * scale }).png().toFile(path.join(destination, `${name}${selected ? '-selected' : ''}${suffix}.png`));
      }
    }
  }
  console.log('Generated 4 Hugeicons tab icons in 2 states and 3 densities.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
