/**
 * Regel- und Rätseltests für die spielbare Anzeige:  node --test scripts/playable/test.cjs
 * (Kopie im Werbung-Repo: MUEHLE_APP=<Pfad zum Mühle-Projekt> node --test playables/src/muehle-meister/test.cjs)
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const E = require('./engine.js');

/** Mühle-App-Projekt; in der Kopie im Werbung-Repo per MUEHLE_APP setzen. */
const ROOT = path.resolve(process.env.MUEHLE_APP || path.join(__dirname, '..', '..'));
const constants = fs.readFileSync(path.join(ROOT, 'lib', 'game', 'constants.ts'), 'utf8');
const coords = fs.readFileSync(path.join(ROOT, 'lib', 'utils', 'boardCoordinates.ts'), 'utf8');

test('Nachbarschaft und Mühlen-Linien sind die der App (lib/game/constants.ts)', () => {
  const adj = constants.slice(constants.indexOf('export const ADJACENCY'), constants.indexOf('};', constants.indexOf('export const ADJACENCY')));
  for (let p = 0; p < 24; p++) {
    const m = new RegExp('\\n\\s*' + p + ': \\[([^\\]]*)\\]').exec(adj);
    assert.ok(m, 'ADJACENCY ' + p);
    assert.deepEqual(E.ADJACENCY[p], m[1].split(',').map((s) => Number(s.trim())), 'ADJACENCY ' + p);
  }
  const block = constants.slice(constants.indexOf('export const MILL_LINES:'), constants.indexOf('];', constants.indexOf('export const MILL_LINES:')));
  const lines = [...block.matchAll(/\[(\d+), (\d+), (\d+)\]/g)].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
  assert.deepEqual(E.MILL_LINES, lines);
});

test('Knotenkoordinaten sind die des klassischen Bretts (lib/utils/boardCoordinates.ts)', () => {
  const block = coords.slice(coords.indexOf('RELATIVE_COORDS_CLASSIC'), coords.indexOf('];', coords.indexOf('RELATIVE_COORDS_CLASSIC')));
  const pts = [...block.matchAll(/\[([\d.]+),([\d.]+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.deepEqual(E.COORDS, pts);
});

test('jedes Rätsel hat genau einen Zug, der eine Mühle schließt', () => {
  for (const lvl of E.LEVELS) {
    const b = E.newBoard(lvl);
    assert.equal(new Set([...lvl.white, ...lvl.black]).size, lvl.white.length + lvl.black.length, lvl.id + ': doppelt belegt');
    const sol = E.solutions(b, 'W', lvl.phase);
    assert.equal(sol.length, 1, lvl.id + ': ' + JSON.stringify(sol));
  }
  assert.deepEqual(E.solutions(E.newBoard(E.LEVELS[0]), 'W', 'place')[0], { from: null, to: 2 });
  assert.deepEqual(E.solutions(E.newBoard(E.LEVELS[1]), 'W', 'move')[0], { from: 19, to: 18 });
  assert.deepEqual(E.solutions(E.newBoard(E.LEVELS[2]), 'W', 'move')[0], { from: 1, to: 9 });
});

test('Rätsel 2: Steine der schwarzen Mühle sind geschützt', () => {
  const lvl = E.LEVELS[1];
  const b = E.apply(E.newBoard(lvl), { from: 19, to: 18 }, 'W');
  assert.deepEqual(E.removable(b, 'B').sort((x, y) => x - y), [12, 22]);
});

test('Rätsel 3: die Zwickmühle lässt sich nach jedem Schlag nicht verhindern', () => {
  const lvl = E.LEVELS[2];
  const opened = E.apply(E.newBoard(lvl), { from: 1, to: 9 }, 'W');
  assert.ok(E.inMill(opened, 9));
  for (const victim of E.removable(opened, 'B')) {
    const b = opened.slice();
    b[victim] = null;
    assert.ok(!E.canFly(b, 'B'), 'Schwarz darf hier noch nicht springen');
    const m = E.aiMove(b, 'B', 'move');
    assert.ok(m, 'Schwarz hat einen Zug nach Schlag auf ' + victim);
    const after = E.apply(b, m, 'B');
    assert.ok(!E.inMill(after, m.to), 'Schwarz schließt keine eigene Mühle');
    assert.ok(E.closesMill(after, { from: 9, to: 1 }, 'W'), 'Rückzug 9→1 schließt die Mühle nach Schlag auf ' + victim);
    assert.ok(E.solutions(after, 'W', 'move').some((s) => s.from === 9 && s.to === 1));
  }
});

test('Grundregeln: Schlagen aus Mühlen nur, wenn alle Steine in Mühlen stehen; Springen ab drei Steinen', () => {
  const b = Array(24).fill(null);
  [0, 1, 2].forEach((p) => (b[p] = 'B'));
  assert.deepEqual(E.removable(b, 'B'), [0, 1, 2]);
  b[12] = 'B';
  assert.deepEqual(E.removable(b, 'B'), [12]);
  const fly = Array(24).fill(null);
  [0, 5, 20].forEach((p) => (fly[p] = 'W'));
  assert.equal(E.targets(fly, 0).length, 21);
});
