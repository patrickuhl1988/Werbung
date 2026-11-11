#!/usr/bin/env node
/**
 * Prüft die spielbare Feierabend-Rush-Anzeige.
 *
 *   $env:FEIERABEND_APP="D:\Claude\frogger work"; node --test playables/src/feierabend-rush/test.cjs
 *
 * - Konstanten und Spuren stimmen mit der App überein (src/game/engine.ts, src/levels/level1.ts)
 * - das Level ist fair: ein einfacher Bot kommt bei jeder Startphase ohne Treffer ins Ziel
 * - die gebaute HTML-Datei ist eigenständig und spricht die Werbemodul-Brücke
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

require('./engine.js');
const E = globalThis.FeierabendEngine;
const L = E.LEVEL;
const APP = path.resolve(process.env.FEIERABEND_APP || 'D:/Claude/frogger work');
const HTML = path.join(__dirname, '..', '..', 'feierabend-rush.html');
const hasApp = fs.existsSync(path.join(APP, 'src', 'game', 'engine.ts'));

/** Reihe der Anzeige -> Reihe in level1.ts, aus der sie übernommen ist. */
const FROM_L1 = { 2: 2, 3: 3, 5: 5, 6: 6, 8: 8, 10: 16, 12: 10, 13: 11 };

function loadLevel1() {
  let src = fs.readFileSync(path.join(APP, 'src', 'levels', 'level1.ts'), 'utf8');
  src = src.replace(/^import[^\n]*\n/m, '').replace(/const level1:\s*LevelDef\s*=/, 'module.exports =').replace(/export default level1;?/, '');
  const ctx = { module: { exports: {} } };
  vm.runInNewContext(src, ctx);
  return JSON.parse(JSON.stringify(ctx.module.exports));
}

test('Konstanten wie in der App', { skip: !hasApp && 'App-Projekt fehlt' }, () => {
  const src = fs.readFileSync(path.join(APP, 'src', 'game', 'engine.ts'), 'utf8');
  const num = (re) => Number(src.match(re)[1]);
  assert.equal(E.HIT_FORGIVENESS, num(/HIT_FORGIVENESS = ([\d.]+)/));
  assert.equal(E.ENTITY_FORGIVENESS, num(/ENTITY_FORGIVENESS = ([\d.]+)/));
  assert.equal(E.COFFEE_BOOST.seconds, num(/COFFEE_BOOST = \{ seconds: ([\d.]+)/));
  assert.equal(E.COFFEE_BOOST.factor, num(/COFFEE_BOOST = \{[^}]*factor: ([\d.]+)/));
  assert.equal(E.HONK.near, num(/HONK = \{ near: ([\d.]+)/));
  assert.equal(E.HONK.cooldown, num(/HONK = \{[^}]*cooldown: ([\d.]+)/));
  for (const k of ['perRow', 'perGoal', 'perPickup', 'timeBonusPerSecond', 'lifeBonus']) {
    assert.equal(E.SCORE[k], num(new RegExp(k + ': ([\\d.]+)')), k);
  }
});

test('Spuren wie in Level 1 „Der Arbeitsweg“, Tempo wie im Modus „Leicht“', { skip: !hasApp && 'App-Projekt fehlt' }, () => {
  const l1 = loadLevel1();
  assert.equal(L.cols, l1.cols);
  assert.equal(L.speedScale, l1.easyFactor);
  assert.deepEqual(L.goalSlots, l1.goalSlots);
  assert.deepEqual(L.stars, l1.stars);
  for (const [row, src] of Object.entries(FROM_L1)) {
    const a = L.lanes[row];
    const b = l1.lanes[src];
    for (const key of ['kind', 'skin', 'dir', 'speed', 'phase', 'patternCells']) assert.equal(a[key], b[key], `Reihe ${row}.${key}`);
    assert.deepEqual(a.entities, b.entities, `Reihe ${row}.entities`);
  }
  assert.equal(L.lanes[L.lanes.length - 1].kind, 'goal');
  assert.equal(L.lanes[0].kind, 'start');
});

test('Sicherheitsregel der App: nach höchstens zwei Gefahrenreihen kommt eine sichere', () => {
  let run = 0;
  for (const lane of L.lanes) {
    run = lane.kind === 'traffic' ? run + 1 : 0;
    assert.ok(run <= 2);
  }
});

/**
 * Bot wie ein vorsichtiger Mensch: wartet auf einer sicheren Reihe, bis der
 * ganze folgende Gefahrenblock im Hüpftakt (0,15 s) frei ist, und läuft dann durch.
 */
function botRun(t0) {
  const dt = 1 / 60;
  const HOP = 0.15;
  let t = t0, real = 0, row = 0, x = 4, hits = 0, coffeeUntil = -1, next = 0;
  const safe = (lane, xx, from, dur) => {
    if (lane.kind !== 'traffic') return true;
    for (let s = 0; s <= dur; s += 0.02) if (E.laneHitsPlayer(lane, from + s, xx, L.speedScale)) return false;
    return true;
  };
  const blockClear = (f) => {
    for (let i = 1; row + i < L.lanes.length; i++) {
      const lane = L.lanes[row + i];
      if (lane.kind !== 'traffic') return true;
      if (!safe(lane, x, t + (i - 1) * HOP * f, (HOP + 0.25) * f)) return false;
    }
    return true;
  };
  while (real < L.timeLimit) {
    const f = real < coffeeUntil ? E.COFFEE_BOOST.factor : 1;
    if (real >= next) {
      const up = L.lanes[row + 1];
      const go = L.lanes[row].kind === 'traffic' ? safe(up, x, t, (HOP + 0.25) * f) : blockClear(f);
      if (up && go) {
        row++;
        next = real + HOP;
        if (up.pickup && up.pickup.at === x) coffeeUntil = real + E.COFFEE_BOOST.seconds;
        if (up.kind === 'goal') return { ok: hits === 0, time: real, hits };
      }
    }
    real += dt;
    t += dt * f;
    const lane = L.lanes[row];
    if (lane.kind === 'traffic' && E.laneHitsPlayer(lane, t, x, L.speedScale)) hits++;
  }
  return { ok: false, time: real, hits };
}

test('Lösbar ohne Treffer, aus jeder Startphase, mit viel Zeitreserve', () => {
  let worst = 0;
  for (let t0 = 0; t0 < 40; t0 += 0.37) {
    const r = botRun(t0);
    assert.ok(r.ok, `Startphase ${t0.toFixed(2)}: ${JSON.stringify(r)}`);
    worst = Math.max(worst, r.time);
  }
  assert.ok(worst < L.timeLimit * 0.6, `langsamster Bot-Lauf ${worst.toFixed(1)} s`);
});

test('Auswertung wie evaluateRun der App', () => {
  const r = E.evaluate(L, { rowScore: 150, goalsFilled: 1, pickups: 6, livesLeft: 3, timeLeft: 50 });
  assert.equal(r.score, 150 + 600 + 6 * 25 + 150 + 600);
  assert.equal(r.stars, 3);
  assert.equal(E.evaluate(L, { rowScore: 150, goalsFilled: 1, pickups: 1, livesLeft: 3, timeLeft: 50 }).stars, 2);
  assert.equal(E.evaluate(L, { rowScore: 150, goalsFilled: 1, pickups: 6, livesLeft: 1, timeLeft: 50 }).stars, 1);
});

test('Gebaute Datei: eigenständig, Brücke, Store-Ziel, sieben Sprachen', { skip: !fs.existsSync(HTML) && 'feierabend-rush.html fehlt' }, () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const urls = (html.match(/https?:\/\/[^\s"'<>)]+/g) || []).filter((u) => !u.startsWith('https://play.google.com/store/apps/details?id='));
  assert.deepEqual(urls, [], 'keine externen Adressen');
  assert.ok(!/<(script|link|img)[^>]+(src|href)=["']https?:/i.test(html));
  for (const m of ["type:'wm:ready'", "type:'wm:cleared'", "type:'wm:cta'", "'wm:mute'", "'wm:pause'", "'wm:resume'", 'ReactNativeWebView']) assert.ok(html.includes(m), m);
  assert.ok(html.includes("STORE_ID='de.patrickuhl.feierabendrush'"));
  for (const lang of ['de', 'en', 'es', 'fr', 'it', 'nl', 'pt']) assert.ok(new RegExp('\\n' + lang + ':\\{level:').test(html), lang);
  assert.ok(!/__[A-Z_]{3,}__/.test(html), 'kein Platzhalter übrig');
  assert.ok(Buffer.byteLength(html) < 1.5 * 1024 * 1024, 'unter 1,5 MB');
});
