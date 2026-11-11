#!/usr/bin/env node
/**
 * Baut die spielbare Feierabend-Rush-Anzeige als eine einzige HTML-Datei
 * (keine externen Requests, kein Tracking).
 *
 *   node playables/src/feierabend-rush/build.cjs playables/feierabend-rush.html --app "D:\Claude\frogger work"
 *
 * Eingebettet werden aus dem App-Projekt:
 *  - engine.js (Spurformeln + Level, auch von test.cjs geprüft)
 *  - die Spiel-Sprites aus assets/sprites (WebP), Größen und Überstände aus
 *    src/assets/spriteManifest.ts – damit stehen Fahrzeuge genau wie im Spiel
 *  - die Bodentexturen aus assets/textures und die Straßen-Kulisse
 *    (assets/images/ui/street-top.jpg, street-start.jpg)
 *  - die Original-Klänge aus assets/audio/sfx (MP3 mono)
 *  - das Store-Symbol aus src/werbemodul/assets/icons/feierabend-rush.png
 *
 * Braucht keine globalen Werkzeuge: sharp und ffmpeg-static kommen aus den
 * node_modules des App-Projekts. Es entstehen keine Zwischendateien.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');

const HERE = __dirname;
const argv = process.argv.slice(2);
const appIdx = argv.indexOf('--app');
const ROOT = path.resolve(appIdx >= 0 ? argv[appIdx + 1] : process.env.FEIERABEND_APP || 'D:/Claude/frogger work');
const outArg = argv.find((a, i) => !a.startsWith('--') && i !== appIdx + 1);
const OUT = path.resolve(outArg || path.join(HERE, '..', '..', 'feierabend-rush.html'));

const appRequire = createRequire(path.join(ROOT, 'package.json'));
const sharp = appRequire('sharp');
const FFMPEG = appRequire('ffmpeg-static');

/** Sprites, die die Anzeige zeigt (Schlüssel wie in spriteManifest.ts). */
const SPRITE_KEYS = ['car', 'van', 'bus', 'tram', 'bike', 'scooter', 'coin', 'coffee', 'player-sachbearbeiter'];

/** Bodentexturen und Kulisse. */
const TEXTURES = {
  grass: 'assets/textures/grass.jpg',
  sidewalk: 'assets/textures/sidewalk.jpg',
  road: 'assets/textures/road.jpg',
  roadDashed: 'assets/textures/road-dashed.jpg',
  tiles: 'assets/textures/tiles.jpg',
  streetTop: 'assets/images/ui/street-top.jpg',
  streetStart: 'assets/images/ui/street-start.jpg',
};

/** Effekt-Name in der Anzeige -> Datei in assets/audio/sfx (Namen wie AudioManager.ts). */
const SOUNDS = {
  hop: 'hop.m4a',
  coin: 'coin.m4a',
  crash: 'crash.m4a',
  honk: 'honk.m4a',
  goal: 'goal.m4a',
  levelStart: 'level-start.m4a',
  stingComplete: 'sting-complete.m4a',
  stingStar: 'sting-star.m4a',
  stingGameover: 'sting-gameover.m4a',
  tap: 'tap.m4a',
};

function readManifest() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'assets', 'spriteManifest.ts'), 'utf8');
  const re = /'([\w-]+)':\s*\{\s*source:\s*require\('([^']+)'\),\s*cells:\s*([\d.]+),\s*overhang:\s*([\d.]+)/g;
  const out = {};
  let m;
  while ((m = re.exec(src))) out[m[1]] = { file: m[2].replace(/^(\.\.\/)+/, ''), cells: Number(m[3]), overhang: Number(m[4]) };
  return out;
}

async function webp(file, opts) {
  let img = sharp(path.join(ROOT, file));
  if (opts.width) img = img.resize({ width: opts.width, withoutEnlargement: true });
  const buf = await img.webp({ quality: opts.quality, alphaQuality: 90, effort: 6 }).toBuffer();
  return 'data:image/webp;base64,' + buf.toString('base64');
}

function mp3(file) {
  const src = path.join(ROOT, 'assets', 'audio', 'sfx', file);
  const buf = execFileSync(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-i', src, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', '-f', 'mp3', 'pipe:1'],
    { maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return buf.toString('base64');
}

function fill(template, key, value) {
  const marker = '__' + key + '__';
  if (!template.includes(marker)) throw new Error('Platzhalter fehlt: ' + marker);
  return template.split(marker).join(value);
}

async function main() {
  const manifest = readManifest();
  const sprites = {};
  for (const key of SPRITE_KEYS) {
    const e = manifest[key];
    if (!e) throw new Error('Sprite fehlt im Manifest: ' + key);
    sprites[key] = { src: await webp(e.file, { quality: 84 }), cells: e.cells, overhang: e.overhang };
  }
  const textures = {};
  for (const [key, file] of Object.entries(TEXTURES)) textures[key] = await webp(file, { quality: 76 });
  const sounds = {};
  for (const [key, file] of Object.entries(SOUNDS)) sounds[key] = mp3(file);
  const icon = await (async () => {
    const buf = await sharp(path.join(ROOT, 'src', 'werbemodul', 'assets', 'icons', 'feierabend-rush.png'))
      .resize(168, 168, { kernel: 'lanczos3' })
      .webp({ quality: 86 })
      .toBuffer();
    return 'data:image/webp;base64,' + buf.toString('base64');
  })();

  let html = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');
  html = fill(html, 'ENGINE', fs.readFileSync(path.join(HERE, 'engine.js'), 'utf8').replace(/<\/script/gi, '<\\/script'));
  html = fill(html, 'SPRITES', JSON.stringify(sprites));
  html = fill(html, 'TEXTURES', JSON.stringify(textures));
  html = fill(html, 'SOUNDS', JSON.stringify(sounds));
  html = fill(html, 'ICON', icon);
  if (/__[A-Z_]{3,}__/.test(html.replace(/window\.__frPlayable/g, ''))) throw new Error('Unersetzter Platzhalter in der Ausgabe');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html);

  const kb = (n) => (n / 1024).toFixed(0) + ' KB';
  const sum = (o) => Object.values(o).reduce((n, s) => n + (typeof s === 'string' ? s.length : s.src.length), 0);
  console.log(
    `${path.relative(process.cwd(), OUT)}: ${kb(Buffer.byteLength(html))} ` +
      `(Sprites ${kb(sum(sprites))}, Texturen ${kb(sum(textures))}, Klänge ${kb(sum(sounds))} base64)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
