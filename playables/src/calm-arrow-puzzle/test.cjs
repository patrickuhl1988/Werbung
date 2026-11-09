/**
 * Prüft die gebaute Anzeige: node --test playables/src/calm-arrow-puzzle/test.cjs
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', '..', 'calm-arrow-puzzle.html'), 'utf8');
const DATA = JSON.parse(HTML.slice(HTML.indexOf('const DATA = ') + 13, HTML.search(/;\n\/\* ===== Anzeige|;\nconst STORE/)));
const Board = new Function(HTML.slice(HTML.indexOf('const key = (c)'), HTML.indexOf('/* ===== Pfeil-Zeichnung')) + '\nreturn Board;')();

test('eine Datei, kleiner als 5 MB, ohne Netzwerkadressen außer dem Store', () => {
  assert.ok(HTML.length < 5 * 1024 * 1024);
  assert.strictEqual((HTML.match(/(src|href)=["']https?:/g) || []).length, 0);
  assert.ok(!/fetch\(|XMLHttpRequest|import\(/.test(HTML));
  assert.ok(HTML.includes('https://play.google.com/store/apps/details?id=com.neondrift.nightrun'));
  assert.ok(HTML.includes('<meta name="ad.size"'));
});

test('Brücke wie bei den anderen Playables', () => {
  for (const t of ['wm:ready', 'wm:cleared', 'wm:cta', 'wm:mute', 'wm:pause', 'wm:resume', 'ReactNativeWebView', 'mraid', 'FbPlayableAd', 'dapi']) assert.ok(HTML.includes(t), t);
});

test('drei Level, jedes lösbar, jedes mit Bild', () => {
  assert.strictEqual(DATA.levels.length, 3);
  for (const l of DATA.levels) {
    const b = new Board(l);
    let n = 0;
    while (b.remaining() > 0) { const fr = b.free(); assert.ok(fr.length, 'Sackgasse'); b.remove(fr[0]); n++; }
    assert.strictEqual(n, l.arrows.length);
    assert.ok(l.picture.startsWith('data:image/webp;base64,'));
  }
});

test('Regel: blockiert, wenn ein Pfeil auf der Fahrlinie liegt', () => {
  const b = new Board({ w: 4, h: 1, arrows: [{ cells: [[0, 0]], dir: [1, 0] }, { cells: [[2, 0]], dir: [0, 1] }] });
  assert.strictEqual(b.reason(0), 'blocked');
  assert.strictEqual(b.reason(1), '');
  b.remove(1);
  assert.strictEqual(b.reason(0), '');
});

test('sieben Sprachen mit allen Texten', () => {
  const keys = Object.keys(DATA.i18n.en);
  for (const [lang, t] of Object.entries(DATA.i18n)) for (const k of keys) assert.ok(t[k], `${lang}.${k}`);
  for (const l of DATA.levels) for (const lang of Object.keys(DATA.i18n)) assert.ok(l.name[lang], `${lang} Name`);
});

test('alle Klänge eingebettet (M4A)', () => {
  for (const s of ['arrow_out_1', 'arrow_out_2', 'arrow_out_3', 'chain_1', 'blocked', 'heart_lost', 'reveal', 'ui_tap']) {
    const b = Buffer.from(DATA.sounds[s], 'base64');
    assert.strictEqual(b.subarray(4, 8).toString('latin1'), 'ftyp', s);
  }
});
