#!/usr/bin/env node
/**
 * Baut die spielbare Mühle-Anzeige als eine einzige HTML-Datei (keine externen Requests).
 *
 *   node scripts/playable/build.cjs            -> scripts/playable/dist/muehle-meister.html
 *   node scripts/playable/build.cjs <ziel.html>
 *   node build.cjs <ziel.html> --app "D:\Mobile Games\mühle claude"   (Kopie im Werbung-Repo)
 *
 * Eingebettet werden:
 *  - engine.js (Regeln + Rätsel, auch von test.cjs geprüft)
 *  - die Original-Soundeffekte aus assets/sounds (als MP3 128 kbit/s mono – ein Viertel der WAV-Größe)
 *  - Inter Regular/Bold aus assets/fonts/monochrome, auf Latin-1 + Satzzeichen reduziert (WOFF2)
 *  - das Store-Icon aus src/werbemodul/assets/icons/muehle-meister.png (WebP) für die Endkarte
 *
 * Benötigt ffmpeg (libmp3lame, libwebp) und Python mit fontTools + brotli im PATH.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const argv = process.argv.slice(2);
const appIdx = argv.indexOf('--app');
/** Mühle-App-Projekt (Sounds, Schrift, Icon). Standard: dieses Skript liegt in <app>/scripts/playable. */
const ROOT = path.resolve(appIdx >= 0 ? argv[appIdx + 1] : process.env.MUEHLE_APP || path.join(HERE, '..', '..'));
const outArg = argv.find((a, i) => !a.startsWith('--') && i !== appIdx + 1);
const OUT = path.resolve(outArg || path.join(HERE, 'dist', 'muehle-meister.html'));
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'muehle-playable-'));

/** Effekt-Name in der Anzeige -> Datei in assets/sounds (Namen wie lib/sound/SoundManager.ts). */
const SOUNDS = {
  place: 'place.wav',
  move: 'move.wav',
  select: 'select.wav',
  invalid: 'invalid.wav',
  mill: 'mill.wav',
  zwick: 'zwick.wav',
  remove: 'remove.wav',
  puzzleSolved: 'puzzle-solved.wav',
  win: 'win.wav',
  buttonTap: 'button-tap.wav',
};

const SUBSET_UNICODES = 'U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+201E,U+2022,U+2026,U+2192,U+2197,U+2713';

function run(cmd, args) {
  execFileSync(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
}

function b64(file) {
  return fs.readFileSync(file).toString('base64');
}

function encodeSound(name, file) {
  const src = path.join(ROOT, 'assets', 'sounds', file);
  const dst = path.join(TMP, name + '.mp3');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', dst]);
  return b64(dst);
}

function subsetFont(file) {
  const src = path.join(ROOT, 'assets', 'fonts', 'monochrome', file);
  const dst = path.join(TMP, file.replace(/\.ttf$/, '.woff2'));
  run('python', ['-m', 'fontTools.subset', src, '--unicodes=' + SUBSET_UNICODES, '--flavor=woff2', '--layout-features=kern,liga,calt', '--output-file=' + dst]);
  return b64(dst);
}

function encodeIcon() {
  const src = path.join(ROOT, 'src', 'werbemodul', 'assets', 'icons', 'muehle-meister.png');
  const dst = path.join(TMP, 'icon.webp');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf', 'scale=168:168:flags=lanczos', '-c:v', 'libwebp', '-quality', '86', dst]);
  return 'data:image/webp;base64,' + b64(dst);
}

function fill(template, key, value) {
  const marker = '__' + key + '__';
  if (!template.includes(marker)) throw new Error('Platzhalter fehlt: ' + marker);
  return template.split(marker).join(value);
}

const sounds = {};
for (const [name, file] of Object.entries(SOUNDS)) sounds[name] = encodeSound(name, file);

let html = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');
html = fill(html, 'ENGINE', fs.readFileSync(path.join(HERE, 'engine.js'), 'utf8').replace(/<\/script/gi, '<\\/script'));
html = fill(html, 'SOUNDS', JSON.stringify(sounds));
html = fill(html, 'FONT_REGULAR', subsetFont('Inter-Regular.ttf'));
html = fill(html, 'FONT_BOLD', subsetFont('Inter-Bold.ttf'));
html = fill(html, 'ICON', encodeIcon());
if (/__[A-Z_]+__/.test(html.replace(/window\.__muehlePlayable/g, ''))) throw new Error('Unersetzter Platzhalter in der Ausgabe');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
fs.rmSync(TMP, { recursive: true, force: true });

const kb = (n) => (n / 1024).toFixed(0) + ' KB';
const soundBytes = Object.values(sounds).reduce((n, s) => n + s.length, 0);
console.log(`${path.relative(process.cwd(), OUT)}: ${kb(Buffer.byteLength(html))} (Sounds ${kb(soundBytes)} base64)`);
