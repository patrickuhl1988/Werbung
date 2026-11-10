/* Prüft playables/sonaris.html:  node --test playables/src/sonaris/test.cjs
   Mit SONARIS_GAME="<Sonaris-Projekt>" werden Schwimmwerte, Ringe und Modelle gegen die Skripte des Spiels geprüft. */
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "..", "sonaris.html"), "utf8");
const js = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
const DATA = JSON.parse(/var DATA = (\{[\s\S]*?\});\n/.exec(js)[1]);
const code = js.replace(/var DATA = [\s\S]*?\};\n/, "");
const GAME = path.join(process.env.SONARIS_GAME || path.join(__dirname, "..", "..", "..", "..", "Sonaris Die versunkene Stadt"), "godot-3d");
const gd = (name) => fs.readFileSync(path.join(GAME, "scripts", name + ".gd"), "utf8");
const haveGame = fs.existsSync(path.join(GAME, "scripts", "player.gd"));
const skip = !haveGame && "Spielprojekt nicht gefunden (SONARIS_GAME setzen)";
const both = (source, a, b, label) => assert.ok(source.includes(a) && code.includes(b), label || b);

test("Skript ist gültiges JavaScript", () => { new Function(js); });

test("eine Datei, unter 700 KB, nichts wird nachgeladen", () => {
  assert.ok(Buffer.byteLength(html) < 700 * 1024, "Größe " + Buffer.byteLength(html));
  assert.ok(!/https?:\/\/(?!play\.google\.com|www\.w3\.org)[a-z]/i.test(code), "keine externen Adressen");
  assert.ok(!/<(link|img|script|iframe)[^>]+(src|href)=/i.test(html), "keine nachgeladenen Dateien");
  assert.ok(!/\b(fetch|XMLHttpRequest|sendBeacon|localStorage|document\.cookie)\b/.test(code), "kein Netz, kein Speicher");
});

test("Modelle, Klänge, Schrift und Symbol sind eingebettet", () => {
  ["body", "FlipperLeft", "FlipperRight", "Tail"].forEach((k) => {
    const g = DATA.kai[k];
    assert.ok(g && g.tris > 100 && g.verts < 65536, "Kai " + k);
    assert.strictEqual(Buffer.from(g.p, "base64").length, g.verts * 6, k + " Positionen");
    assert.strictEqual(Buffer.from(g.n, "base64").length, g.verts * 3, k + " Normalen");
    assert.strictEqual(Buffer.from(g.c, "base64").length, g.verts * 4, k + " Farben");
    const idx = new Uint16Array(new Uint8Array(Buffer.from(g.i, "base64")).buffer);
    assert.strictEqual(idx.length, g.tris * 3);
    assert.ok(Math.max(...idx) < g.verts, k + " Indizes");
  });
  assert.ok(DATA.kai.body.tris > 3000 && DATA.lumen.body.tris > 3000);
  const sounds = Object.keys(DATA.sfx);
  assert.deepStrictEqual(sounds.sort(), ["coin_1", "coin_2", "coin_3", "dash", "echo", "ring_1", "ring_2", "ring_3", "step_done", "success", "ui_tap_1", "wall_bump_1"]);
  sounds.concat(["music"]).forEach((k) => {
    const b = Buffer.from(k === "music" ? DATA.music : DATA.sfx[k], "base64");
    assert.ok(b.slice(0, 3).toString() === "ID3" || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0), "MP3 " + k);
  });
  ["font400", "font900"].forEach((k) => assert.strictEqual(Buffer.from(DATA[k], "base64").slice(0, 4).toString(), "wOF2", k));
  assert.strictEqual(Buffer.from(DATA.icon, "base64").slice(8, 12).toString(), "WEBP");
});

test("sieben Sprachen, jeder Text vollständig", () => {
  const block = /var TEXT = (\{[\s\S]*?\n  \});/.exec(code)[1];
  const TEXT = new Function("return " + block)();
  assert.ok(code.includes('LANGS = ["de", "en", "es", "fr", "it", "nl", "pt"]'));
  Object.keys(TEXT).forEach((k) => {
    assert.strictEqual(TEXT[k].length, 7, k);
    TEXT[k].forEach((t) => assert.ok(Array.isArray(t) ? t.length === 2 && t.every((x) => x.length > 1) : t.length > 1, k));
  });
  ["eyebrow", "title", "goal", "coach", "cta", "pitch", "again", "ad"].forEach((k) => assert.ok(TEXT[k], k));
});

test("Brücke, Store-Ziel und Ton wie bei den anderen spielbaren Anzeigen", () => {
  ["wm:ready", "wm:cleared", "wm:cta", "wm:mute", "wm:pause", "wm:resume", "ReactNativeWebView", "id=com.sonaris.drownedcity", 'Q.get("muted")', 'Q.get("lang")', "mraid.open", "FbPlayableAd", "dapi.openStoreUrl", 'game: "sonaris"'].forEach((s) => assert.ok(code.includes(s), s));
  assert.strictEqual((code.match(/type: "wm:cleared"/g) || []).length, 1, "wm:cleared nur an einer Stelle");
});

test("Schwimmen und Kamera wie scripts/player.gd", { skip }, () => {
  const p = gd("player");
  both(p, "var rate=9.0 if stopping else 7.5 if reversing else 4.8", "rate = stopping ? 9 : reversing ? 7.5 : 4.8", "Beschleunigung");
  both(p, "var swim_speed = 9.0", "[dir[0] * 9, dir[1] * 9, dir[2] * 9]", "Tempo");
  both(p, "velocity = -model.basis.z * 21", "[f[0] * 21, f[1] * 21, f[2] * 21]", "Dash");
  both(p, "dash_charges = minf(3,dash_charges+dt/.95)", "Math.min(3, p.dash + dt / .95)", "Dash-Ladungen");
  both(p, "dash_timer = .3", "player.dashT = .3");
  both(p, "echo_timer = .8", "player.echoT = .8");
  both(p, "var air = 75.0", "air: 75");
  both(p, "var camera_distance = 11.0", "rotY([0, 3.1 - p.lookPitch * 7, 11], p.lookYaw)", "Kameraabstand");
  both(p, "camera.fov = 61", "p.dashT > 0 ? 70 : 61", "Blickwinkel");
  both(p, "clampf(-turn_rate*.10,-.32,.32)*minf(1,velocity.length()/6)", "clamp(-turn * .10, -.32, .32) * Math.min(1, speed / 6)", "Schräglage");
  both(p, 'model.get_node("Tail").rotation.x = sin(clock*(5+velocity.length()*.6))*.3', "Math.sin(p.clock * (5 + speed * .6)) * .3", "Schwanzschlag");
  both(p, "drone.position = Vector3(1.7,1+(0 if reduced_motion else sin(clock*2)*.2),-.3).rotated(Vector3.UP,yaw)", "rotY([1.7, 1 + bob", "Lumen neben Kai");
});

test("Ringe wie scripts/ring_gate.gd und scripts/activities.gd", { skip }, () => {
  const g = gd("ring_gate"), a = gd("activities");
  both(a, "const RING_RADIUS = 2.4", "RADIUS = 2.4");
  both(a, "var point = Vector3(sin(a)*18,6+sin(a*1.4)*3,cos(a)*18)", "[Math.sin(a) * 18, 6 + Math.sin(a * 1.4) * 3, Math.cos(a) * 18]", "Ringbahn");
  both(a, "var a = n*.75", "var a = n * .75");
  both(a, "player.reset_at(Vector3(0,7,22))", "START = [0, 7, 22]");
  both(a, 'if id == "rings": remaining = 32', "remaining: 32");
  both(a, "remaining = minf(60,remaining+(2.0 if count<8", "Math.min(60, round.remaining + 2)", "Zeitbonus");
  both(g, 'const PALETTE=[Color("ffc63d"),Color("ff6fae"),Color("a98bff")]', 'PALETTE = [hex("ffc63d"), hex("ff6fae"), hex("a98bff")]', "Ringfarben");
  both(g, "const CROSS_TOLERANCE=1.3", "<= g.r * 1.3");
  both(g, "const SPHERE_TOLERANCE=1.15", "<= g.r * 1.15");
  both(g, "var pull=(1.0-absf(local.z)/reach)*.45", "(1 - Math.abs(l[2]) / 7) * .45", "Zug zur Ringmitte");
  both(g, "torus.inner_radius=radius-.27;torus.outer_radius=radius+.27", "b.torus([0, 0, 0], RADIUS, .27", "Ringdicke");
  both(g, "float flow = 0.5 + 0.5 * sin(angle * 6.0 - TIME * 4.0 * motion);", "float flow=.5+.5*sin(angle*6.-uTime*4.);", "Ring-Shader");
});

test("Arena, Echo und Modelle wie im Spiel", { skip }, () => {
  const a = gd("activities"), m = gd("models"), e = gd("echo_response"), w = gd("world"), t = gd("shell_trail");
  both(a, "var p = Vector3(sin(a)*38,0,cos(a)*38)", "p = [Math.sin(a) * 38, 0, Math.cos(a) * 38]", "Bogenkreis");
  both(a, "Models.arch(arcade,stone,Vector3.ZERO,5,10+i%3*2,.4)", "b.arch(5, 10 + i % 3 * 2, .4, STONE)", "Bögen");
  both(a, 'Models.Surfaces.make("limestone",Color("7c9b96"))', 'STONE = hex("7c9b96")');
  both(e, "const WAVE_SPEED=30.0", "echo.t * 30");
  both(e, "const REACH=24.0", "d2 < 24");
  both(t, "const REACH=2.4", "REACH = 2.4");
  both(w, 'environment.fog_light_color = Color("32838d")', "vec3(.196,.514,.553)", "Nebelfarbe");
  both(m, "flipper.position = Vector3(s*0.48,-0.22,-0.65)", "FlipperLeft");
  assert.deepStrictEqual(DATA.kai.FlipperLeft.pivot, [-0.48, -0.22, -0.65]);
  assert.deepStrictEqual(DATA.kai.FlipperRight.pivot, [0.48, -0.22, -0.65]);
  assert.deepStrictEqual(DATA.kai.Tail.pivot, [0, 0, 1.68]);
  both(m, 'var tint=Color("d77f83").lerp(Color("f3b9aa"),.35+.45*ridge)', 'a = hex("d77f83"), b = hex("f3b9aa")', "Muschelfarben");
  const glb = fs.readFileSync(path.join(GAME, "models", "kai.glb"));
  const meta = JSON.parse(glb.slice(20, 20 + glb.readUInt32LE(12)).toString());
  const tris = meta.meshes.reduce((n, mesh) => n + mesh.primitives.reduce((k, p) => k + meta.accessors[p.indices].count / 3, 0), 0);
  const packed = ["body", "FlipperLeft", "FlipperRight", "Tail"].reduce((n, k) => n + DATA.kai[k].tris, 0);
  assert.ok(packed > tris * .95 && packed <= tris, "Kai: " + packed + " von " + tris + " Dreiecken");
});
