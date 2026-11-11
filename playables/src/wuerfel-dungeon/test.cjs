/**
 * Regeltest der spielbaren Anzeige gegen das Spiel.
 *   $env:WD_GAME = "D:/Claude/Würfel Dungeon"; node --test playables/src/wuerfel-dungeon/test.cjs
 * Prüft Kombo-Erkennung und -Werte (rules.gd), Gegner-LP und -Schaden (game-data.json, „Leicht“),
 * die Tutorial-Würfe und dass die gebaute Datei eigenständig ist und die Brücke spricht.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const GAME = process.env.WD_GAME || 'D:/Claude/Würfel Dungeon';
const tpl = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const start = tpl.indexOf('const RULES = (() => {');
const end = tpl.indexOf('/* ===== Ende Regeln');
const RULES = new Function(tpl.slice(start, end) + '\nreturn RULES;')();
const dice = (faces) => faces.map((v, i) => ({ i, v }));
const names = (faces) => RULES.recognize(dice(faces)).map((c) => c.type + (c.face ? c.face : c.faceA ? `${c.faceA}/${c.faceB}` : '')).sort();
const data = JSON.parse(fs.readFileSync(path.join(GAME, 'godot/data/game-data.json'), 'utf8'));

test('Kombo-Werte wie rules.gd combo_values (shieldFactor 0,6)', () => {
  assert.equal(data.tuning.shieldFactor, 0.6);
  const v = (type, face, extra = {}) => RULES.comboValues({ type, face, ...extra });
  assert.deepEqual(v('pasch', 3), { attack: 6, shield: 5, heal: 3 });
  assert.deepEqual(v('drilling', 4), { attack: 16, shield: 11, heal: 8 });
  assert.deepEqual(v('vierling', 5), { attack: 35, shield: 23, heal: 15 });
  assert.deepEqual(v('fuenfling', 6), { attack: 72, shield: 47, heal: 30 });
  assert.deepEqual(v('kstrasse', 0), { attack: 14, shield: 10, heal: 7 });
  assert.deepEqual(v('gstrasse', 0), { attack: 22, shield: 16, heal: 11 });
  assert.deepEqual(v('fullhouse', 0, { faceA: 2, faceB: 5 }), { attack: 32, shield: 22, heal: 16 });
  // Formeln stehen so auch in game-data.json (combos.*.val)
  assert.match(data.combos.vierling.val, /attack: 7 \* W,\s+shield: 7 \* W \+ 4,\s+heal: 3 \* W/);
});

test('Kombo-Erkennung (recognized_partition)', () => {
  assert.deepEqual(names([3, 3, 1, 5, 6]), ['pasch3']);
  assert.deepEqual(names([4, 4, 4, 6, 1]), ['drilling4']);
  assert.deepEqual(names([5, 5, 5, 5, 2]), ['vierling5']);
  assert.deepEqual(names([6, 6, 6, 6, 6]), ['fuenfling6']);
  assert.deepEqual(names([2, 2, 5, 5, 5]), ['fullhouse2/5']);
  assert.deepEqual(names([1, 2, 3, 4, 6]), ['kstrasse']);
  assert.deepEqual(names([2, 3, 4, 5, 6]), ['gstrasse']);
  assert.deepEqual(names([1, 1, 6, 6, 3]), ['pasch1', 'pasch6']);
  assert.deepEqual(names([1, 3, 5, 2, 6]), []);
  // Vierling + nichts, Pasch mit kleiner Straße konkurriert: höchster Angriff gewinnt (Straße 14 > Pasch)
  assert.deepEqual(names([3, 3, 4, 5, 6]), ['kstrasse']);
});

test('Gegner-LP und Schaden wie start_fight / dmg_mult (Leicht)', () => {
  const D = data.difficulty.leicht, T = data.tuning;
  const byId = Object.fromEntries(data.enemies.map((e) => [e.id, e]));
  for (const f of RULES.FIGHTS) {
    const e = byId[f.id];
    assert.equal(f.hp, e.hp, f.id + ' Basis-LP');
    assert.deepEqual(f.pattern, e.pattern, f.id + ' Muster');
    const hp = e.boss ? e.hp * D.boss : (e.hp + T.roomHpBonus * f.room) * T.normalHpMultiplier * D.hp;
    assert.equal(RULES.enemyHp(f), Math.floor(hp + 0.5), f.id + ' LP');
    const mult = (e.boss ? D.boss : T.normalDamageMultiplier * D.dmg) * (1 + T.roomDmgScale * f.room);
    assert.equal(RULES.dmgMult(f), mult, f.id + ' Schaden');
  }
  assert.deepEqual(RULES.FIGHTS.map(RULES.enemyHp), [24, 31, 65]);
});

test('Tutorial-Würfe wie rules.gd tutorial_roll', () => {
  const gd = fs.readFileSync(path.join(GAME, 'godot/scripts/rules.gd'), 'utf8');
  assert.match(gd, /return \[3, 3, 1, 5, 6\]/);
  assert.match(gd, /return \[4, 4, 2, 6, 1\]/);
  assert.match(gd, /return \[5, 5, 5, 5, 2\]/);
  assert.deepEqual(RULES.tutorialRoll(0, 1, true, []), [3, 3, 1, 5, 6]);
  const held = [4, 4, 2, 6, 1].map((v, i) => ({ v, locked: i < 2 }));
  assert.deepEqual(RULES.tutorialRoll(0, 2, false, held), [4, 4, 4, 2, 5]);
  assert.equal(RULES.tutorialRoll(1, 1, true, []), null);
});

test('Gebaute Datei: eigenständig, Brücke, alle Sprachen', { skip: !fs.existsSync(path.join(__dirname, '..', '..', 'wuerfel-dungeon.html')) }, () => {
  const html = fs.readFileSync(path.join(__dirname, '..', '..', 'wuerfel-dungeon.html'), 'utf8');
  assert.doesNotMatch(html, /(src|href)=["']https?:/i, 'keine externen Ressourcen');
  assert.doesNotMatch(html, /\bfetch\(|XMLHttpRequest|import\(/);
  for (const m of ['wm:ready', 'wm:cleared', 'wm:cta', 'wm:mute', 'wm:pause', 'wm:resume', 'ReactNativeWebView', 'mraid', 'FbPlayableAd', 'dapi']) assert.ok(html.includes(m), m);
  assert.ok(html.includes('com.patrickuhl.wuerfeldungeon'));
  const json = html.slice(html.indexOf('const DATA = ') + 13, html.indexOf(';\nconst STORE'));
  const DATA = JSON.parse(json);
  assert.deepEqual(Object.keys(DATA.i18n), ['de', 'en', 'fr', 'it', 'es', 'th', 'ko', 'ja', 'zh']);
  const keys = Object.keys(DATA.i18n.de);
  for (const [lang, t] of Object.entries(DATA.i18n)) assert.deepEqual(Object.keys(t).sort(), keys.slice().sort(), lang);
  assert.ok(html.length < 900 * 1024, `Größe ${(html.length / 1024).toFixed(0)} KB`);
});
