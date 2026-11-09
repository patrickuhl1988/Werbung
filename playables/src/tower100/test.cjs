/* Prüft playables/tower100.html:  node --test playables/src/tower100/test.cjs
   Mit TOWER_GAME="<Relic-Tower-Projekt>" werden Lösungen und Klänge gegen die Skripte des Spiels geprüft. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "..", "tower100.html"), "utf8");
const js = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
const DATA = JSON.parse(/var DATA = (\{[\s\S]*?\});\n/.exec(js)[1]);
const GAME = process.env.TOWER_GAME || path.join(__dirname, "..", "..", "..", "..", "Relic Tower");
const gd = (n) => fs.readFileSync(path.join(GAME, "scripts", "floors", "floor_0" + n + ".gd"), "utf8");
const haveGame = fs.existsSync(path.join(GAME, "scripts", "floors", "floor_01.gd"));

test("Skript ist gültiges JavaScript", () => { new Function(js); });

test("drei Etagen mit Titel, je drei Hinweisen und eigenem Raumbild", () => {
  assert.strictEqual(DATA.titles.length, 3);
  assert.deepStrictEqual(DATA.titles.map((t) => t[1]), ["Locked", "Short Circuit", "Caretaker's Room"]);
  DATA.hints.forEach((h) => { assert.strictEqual(h.length, 3); h.forEach((x) => assert.ok(x[0].length > 10 && x[1].length > 10)); });
  DATA.rooms.forEach((r, i) => { const b = Buffer.from(r, "base64"); assert.ok(b.slice(8, 12).toString() === "WEBP", "Raum " + (i + 1)); });
  ["phone", "key_small", "uv_lamp", "keycard"].forEach((k) => assert.ok(DATA.items[k].startsWith("<svg"), k));
});

test("Lösungen wie im Spiel", { skip: !haveGame && "Spielprojekt nicht gefunden" }, () => {
  const f1 = gd(1), f2 = gd(2), f3 = gd(3);
  assert.ok(f1.includes('return "0603" if L.lang == "en" else "0306"') && js.includes('pin = lang === "de" ? "0306" : "0603"'), "Etage 1: PIN");
  assert.ok(f2.includes("const WIRES := [[0, 1], [1, 2], [2, 3], [0, 3]]") && js.includes("WIRES = [[0, 1], [1, 2], [2, 3], [0, 3]]"), "Etage 2: Verdrahtung");
  assert.ok(f2.includes("const START := [false, true, false, true]") && js.includes("START = [false, true, false, true]"), "Etage 2: Startlampen");
  assert.ok(f3.includes("const CODE := [7, 4, 2]") && js.includes("CODE = [7, 4, 2]"), "Etage 3: Tresorcode");
  assert.ok(f3.includes('const ANIMAL_DIGITS := {"cat": 4, "owl": 7, "fish": 2}') && js.includes("DIGITS = { cat: 4, owl: 7, fish: 2 }"), "Etage 3: UV-Ziffern");
  [["const PHONE := Rect2(110, 26, 320, 638)", "PHONE = [110, 26, 320, 638]"], ["const BOX := Rect2(214, 300, 196, 236)", "BOX = [214, 300, 196, 236]"], ["const SAFE := Rect2(318, 226, 200, 200)", "SAFE = [318, 226, 200, 200]"]]
    .forEach(([a, b]) => assert.ok((f1 + f2 + f3).includes(a) && js.includes(b), b));
});

test("Etage 2: genau zwei Schalterpaare lösen (A+B, C+D), kein einzelner Schalter", () => {
  const WIRES = [[0, 1], [1, 2], [2, 3], [0, 3]], START = [false, true, false, true];
  const lamps = (sw) => { const on = START.slice(); sw.forEach((s, i) => { if (s) WIRES[i].forEach((l) => { on[l] = !on[l]; }); }); return on; };
  const found = [];
  for (let m = 0; m < 16; m++) { const sw = [0, 1, 2, 3].map((i) => !!(m & (1 << i))); if (lamps(sw).every(Boolean)) found.push(m); }
  assert.deepStrictEqual(found, [3, 12]);
});

test("Brücke, Store-Ziel und Ton wie bei den anderen spielbaren Anzeigen", () => {
  ["wm:ready", "wm:cleared", "wm:cta", "wm:mute", "wm:pause", "wm:resume", "ReactNativeWebView", "id=org.relictower.awakening", 'Q.get("muted")', 'Q.get("lang")'].forEach((s) => assert.ok(js.includes(s), s));
  assert.ok(!/https?:\/\/(?!play\.google\.com|www\.w3\.org)[a-z]/i.test(js.replace(/var DATA = [\s\S]*?\};\n/, "")), "keine externen Adressen");
  assert.ok(!/<(link|img|script)[^>]+(src|href)=/i.test(html), "keine nachgeladenen Dateien");
});

test("Klänge: dieselben Formeln wie scripts/sfx.gd", { skip: !haveGame && "Spielprojekt nicht gefunden" }, () => {
  const sfx = fs.readFileSync(path.join(GAME, "scripts", "sfx.gd"), "utf8");
  const used = [...js.matchAll(/play\("(\w+)"/g)].map((m) => m[1]).concat(["wood", "metal", "glass", "paper", "plastic", "stone", "plant", "fabric"]);
  new Set(used).forEach((n) => {
    const m = new RegExp('"' + n + '": return wav\\(([\\d.]+),').exec(sfx);
    assert.ok(m, n + " fehlt in sfx.gd");
    assert.ok(new RegExp('"?' + n + '"?: \\[' + m[1].replace(".", "\\.") + ",").test(js), n + ": andere Länge als im Spiel");
  });
});
