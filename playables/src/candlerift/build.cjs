// Baut playables/candlerift.html aus template.html und den Bildern des Spiels.
// Aufruf im Werbung-Repo:  node playables/src/candlerift/build.cjs --game "D:\Claude\Down\lumenfall"
// Braucht Playwright aus dem Spielprojekt (verkleinert Keyart und Symbol zu WebP).
const fs = require('fs');
const path = require('path');

const arg = process.argv.indexOf('--game');
const game = path.resolve(arg > 0 ? process.argv[arg + 1] : '../../Down/lumenfall');
const here = __dirname;
const repo = path.resolve(here, '../../..');
const out = path.join(repo, 'playables/candlerift.html');
const iconOut = path.join(repo, 'images/icons/candlerift.png');

(async () => {
  const { chromium } = require(require.resolve('playwright', { paths: [game] }));
  const b = await chromium.launch();
  const p = await b.newPage();
  const conv = (file, w, h, type, q, crop) => p.evaluate(async ({ data, w, h, type, q, crop }) => {
    const im = new Image(); im.src = data; await im.decode();
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high';
    const [sx, sy, sw, sh] = crop ? [crop[0] * im.width, crop[1] * im.height, crop[2] * im.width, crop[3] * im.height] : [0, 0, im.width, im.height];
    g.drawImage(im, sx, sy, sw, sh, 0, 0, w, h);
    return c.toDataURL(type, q).split(',')[1];
  }, { data: 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'), w, h, type, q, crop });

  const iconCrop = [0.035, 0.035, 0.93, 0.93];  // Rand des Store-Symbols abschneiden
  const key = await conv(path.join(game, 'resources/keyart-abstieg.png'), 1100, 538, 'image/webp', 0.62);
  const icon = await conv(path.join(game, 'resources/icon-bild.png'), 160, 160, 'image/webp', 0.82, iconCrop);
  const iconPng = await conv(path.join(game, 'resources/icon-bild.png'), 256, 256, 'image/png', undefined, iconCrop);
  await b.close();

  const intro = fs.readFileSync(path.join(game, 'public/story/intro.webp')).toString('base64');
  const boss = fs.readFileSync(path.join(game, 'public/story/waechter-1.webp')).toString('base64');
  let html = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
  const parts = { __INTRO__: intro, __BOSS__: boss, __KEYART__: key, __ICON__: icon };
  for (const k of Object.keys(parts)) {
    if (!html.includes(k)) throw new Error('Platzhalter fehlt: ' + k);
    html = html.split(k).join(parts[k]);
  }
  fs.writeFileSync(out, html);
  fs.mkdirSync(path.dirname(iconOut), { recursive: true });
  fs.writeFileSync(iconOut, Buffer.from(iconPng, 'base64'));
  console.log('geschrieben:', path.relative(repo, out), Math.round(html.length / 1024) + ' KB;', path.relative(repo, iconOut));
})().catch((e) => { console.error(e); process.exit(1); });
