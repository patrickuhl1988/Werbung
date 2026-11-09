/* Prüft playables/muehle.html:  node --test playables/src/muehle/test.cjs */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "..", "muehle.html"), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const ctx = { console };
ctx.self = ctx; ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(scripts[0], ctx);
const E = ctx.MuehleEngine;
const DATA = JSON.parse(/var DATA = (\{[\s\S]*?\});\n/.exec(scripts[1])[1]);
const options = E.rulesToBoardOptions(E.buildRules(null, []), "classic");

test("drei Rätsel aus dem Starterpaket, je Sieg in einem Zug", () => {
  assert.strictEqual(DATA.puzzles.length, 3);
  DATA.puzzles.forEach((p) => {
    assert.strictEqual(p.par, 1);
    assert.strictEqual(p.board.length, 24);
    assert.ok(p.toMove === 1 || p.toMove === 2);
  });
});

test("jeder Gewinnzug im Lösungsbaum gewinnt sofort, und der Baum enthält alle Gewinnzüge", () => {
  DATA.puzzles.forEach((p, i) => {
    const s = E.puzzleToState(p);
    const wins = Object.keys(p.tree.wins).sort();
    assert.ok(wins.length > 0, "Rätsel " + (i + 1) + " hat keinen Gewinnzug");
    wins.forEach((k) => {
      const after = E.applyTurn(s, E.parseTurnKey(k), options);
      assert.ok(after.gameOver && after.winner === p.toMove, "Rätsel " + (i + 1) + ": " + k + " gewinnt nicht");
    });
    const all = [...E.legalTurns(s, options)].filter((t) => { const a = E.applyTurn(s, t, options); return a.gameOver && a.winner === p.toMove; }).map((t) => E.turnKey(t)).sort();
    assert.deepStrictEqual(all, wins, "Rätsel " + (i + 1) + ": Baum und Engine weichen ab");
  });
});

test("Rätsel sind nicht trivial: es gibt Züge, die nicht gewinnen", () => {
  DATA.puzzles.forEach((p, i) => {
    const s = E.puzzleToState(p);
    const losing = E.legalTurns(s, options).filter((t) => !E.applyTurn(s, t, options).gameOver);
    assert.ok(losing.length >= 3, "Rätsel " + (i + 1) + " hat nur " + losing.length + " falsche Züge");
  });
});

test("Gewinnzug Schritt für Schritt wie in der Anzeige (Auswahl, Ziel, Schlagen)", () => {
  DATA.puzzles.forEach((p, i) => {
    const t = E.parseTurnKey(Object.keys(p.tree.wins)[0]);
    let s = Object.assign({}, E.puzzleToState(p), { selectedStone: t.from });
    assert.ok(E.getValidMoves(s, options).includes(t.to), "Rätsel " + (i + 1) + ": Ziel nicht erlaubt");
    s = E.makeMove(s, t.to, options);
    assert.ok(s.mustRemove, "Rätsel " + (i + 1) + ": keine Mühle");
    assert.ok(E.getRemovableStones(s, options).includes(t.remove));
    s = E.makeMove(s, t.remove, options);
    assert.ok(s.gameOver && s.winner === p.toMove);
  });
});

test("Brücke, Store-Ziel und Ton wie bei den anderen spielbaren Anzeigen", () => {
  ["wm:ready", "wm:cleared", "wm:cta", "wm:mute", "wm:pause", "wm:resume", "ReactNativeWebView", "id=app.muehle.muehle", 'Q.get("muted")', 'Q.get("lang")'].forEach((s) => assert.ok(html.includes(s), s));
  assert.ok(!/https?:\/\/(?!play\.google\.com|www\.w3\.org)[a-z]/i.test(scripts[1]), "keine externen Adressen außer Store und SVG-Namensraum");
  assert.ok(!/<(link|img|script)[^>]+(src|href)=/i.test(html), "keine nachgeladenen Dateien");
});

test("sieben Sprachen mit denselben Texten", () => {
  const T = vm.runInNewContext("(" + /var T = (\{[\s\S]*?\n  \});/.exec(scripts[1])[1] + ")");
  const langs = [...Object.keys(T)].sort();
  assert.deepStrictEqual(langs, ["de", "en", "es", "fr", "it", "nl", "pt"]);
  const keys = Object.keys(T.de).sort();
  langs.forEach((l) => {
    assert.deepStrictEqual(Object.keys(T[l]).sort(), keys, l);
    Object.keys(T[l]).forEach((k) => assert.ok(T[l][k], l + "." + k));
  });
});

test("Klänge eingebettet und decodierbar", () => {
  ["select", "invalid", "move", "slide", "fly", "mill", "remove", "final-blow", "puzzle-solved", "button-tap"].forEach((s) => {
    const b = Buffer.from(DATA.sounds[s], "base64");
    assert.ok(b.length > 1000 && b.slice(4, 8).toString() === "ftyp", s + " ist kein M4A");
  });
});
