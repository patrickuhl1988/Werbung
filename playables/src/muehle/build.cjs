/* Baut playables/muehle.html: eine eigenständige spielbare Anzeige für Mühle Meister.
   Quelle ist das Mühle-Meister-Wiki im gamestudio-Repo (Engine aus dem App-Code, Originalklänge, App-Symbol):

     node playables/src/muehle/build.cjs --gamestudio <Pfad zum gamestudio-Checkout>

   Übernommen werden die ersten drei Rätsel des kostenlosen Pakets „Endspiele mit drei Steinen“ (endgame 1–3)
   samt Lösungsbaum, nur die dafür nötigen Engine-Module und die Klänge, die die Anzeige abspielt. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const HERE = __dirname;
const OUT = path.join(HERE, "..", "..", "muehle.html");
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const GAMESTUDIO = arg("--gamestudio") || path.join(HERE, "..", "..", "..", "..", "gamestudio");
const WIKI = path.join(GAMESTUDIO, "assets", "wiki", "muehle-meister");

const PACK = "endgame";
const COUNT = 3;
const SOUNDS = ["select", "invalid", "move", "slide", "fly", "mill", "remove", "final-blow", "puzzle-solved", "button-tap"];
/* Module, die Rätsel, Regeln und Zugschlüssel brauchen. KI, Coach, Tutorial, Szenarien bleiben draußen. */
const KEEP = ["game/types", "game/constants", "game/board", "game/rules", "game/engine", "utils/localDate", "utils/boardCoordinates", "puzzle/solver", "puzzle/dailyPuzzle", "puzzle/dailyPuzzles.json"];

function loadEngine(code) {
  const ctx = { console };
  ctx.self = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.MuehleEngine;
}

/* Engine-Bündel in seine def-Blöcke zerlegen und nur KEEP behalten. */
function trimEngine(code) {
  const marker = /\n  \/\* lib\/[^\n]*\*\/\n  def\("([^"]+)"/g;
  const starts = [];
  let m;
  while ((m = marker.exec(code))) starts.push({ at: m.index, name: m[1] });
  const tailAt = code.indexOf("\n  var api = {};");
  if (!starts.length || tailAt < 0) throw new Error("Engine-Aufbau unbekannt – export-engine.js geändert?");
  let out = code.slice(0, starts[0].at);
  starts.forEach((s, i) => {
    if (!KEEP.includes(s.name)) return;
    let block = code.slice(s.at, i + 1 < starts.length ? starts[i + 1].at : tailAt);
    // Tagesrätsel werden nicht gebraucht; puzzleToState liegt im selben Modul.
    if (s.name === "puzzle/dailyPuzzles.json") block = '\n  /* Tagesrätsel: nicht enthalten */\n  def("puzzle/dailyPuzzles.json", function (exports) {\n    exports.__esModule = true;\n    exports.default = {"par1":[],"par2":[],"par3":[]};\n  });';
    out += block;
  });
  const modules = KEEP.filter((n) => !n.endsWith(".json"));
  out += "\n  var api = {};\n  " + JSON.stringify(modules) + ".forEach(function (m) {\n    var e = laden(m);\n    Object.keys(e).forEach(function (k) { if (k !== \"__esModule\") api[k] = e[k]; });\n  });\n  root.MuehleEngine = api;\n})(typeof self !== \"undefined\" ? self : this);\n";
  return out.replace("Spiel-Engine für das Wiki.", "Spiel-Engine für die spielbare Anzeige (gekürzt aus dem Wiki-Bündel).");
}

function main() {
  const full = fs.readFileSync(path.join(WIKI, "muehle-engine.js"), "utf8");
  const E = loadEngine(full);
  const puzzles = E.packPuzzles(PACK).slice(0, COUNT);
  if (puzzles.length !== COUNT) throw new Error("Paket " + PACK + " hat zu wenige Rätsel");

  const engine = trimEngine(full);
  const T = loadEngine(engine);
  ["puzzleToState", "makeMove", "getValidMoves", "getRemovableStones", "getClosedMillLine", "turnKey", "parseTurnKey", "buildRules", "getBoardNodes"].forEach((f) => {
    if (typeof T[f] !== "function") throw new Error("Gekürzte Engine: " + f + " fehlt");
  });

  const sounds = {};
  SOUNDS.forEach((s) => { sounds[s] = fs.readFileSync(path.join(WIKI, "sounds", s + ".m4a")).toString("base64"); });
  const icon = fs.readFileSync(path.join(HERE, "icon.webp")).toString("base64");

  const data = { puzzles: puzzles.map((p) => ({ board: p.board, toMove: p.toMove, par: p.par, tree: p.tree })), sounds, icon };
  let html = fs.readFileSync(path.join(HERE, "template.html"), "utf8");
  html = html.replace("/*__ENGINE__*/", () => engine.replace(/<\/script/gi, "<\\/script"));
  html = html.replace("/*__DATA__*/", () => JSON.stringify(data));
  fs.writeFileSync(OUT, html);
  console.log("geschrieben:", path.relative(process.cwd(), OUT), Math.round(html.length / 1024) + " KB",
    "· Engine", Math.round(engine.length / 1024) + " von " + Math.round(full.length / 1024) + " KB",
    "· Rätsel", PACK, "1–" + COUNT, "· Klänge", SOUNDS.length);
}

main();
