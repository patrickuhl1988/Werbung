# Würfel Dungeon (Dice Dungeon) – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/wuerfel-dungeon.html

Eine eigenständige HTML-Datei (~375 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Gespielt wird ein
gekürzter Lauf mit drei echten Kämpfen des Spiels:

1. **Raum 1 – Schleimwurf.** Das Tutorial des Spiels mit seinen festen Würfen (`tutorial_roll` in `rules.gd`):
   Pasch → Angriff, zwei Vieren halten und neu würfeln → Drilling, dann ein Vierling.
2. **Raum 2 – Knochenkobold.** Freie Würfe, der Kobold greift an und blockt.
3. **Raum 5 – Der Würfelfresser (Boss).** Fluch, Schwächen, Block und der schwere Schlag; unter halben LP brüllt er
   und schlägt danach härter zu (+2 je Angriff, wie im Spiel).

Regeln wie im Spiel (`godot/scripts/rules.gd`, Werte aus `godot/data/game-data.json`, Schwierigkeit „Leicht“):
5 Würfel, 1 Wurf + 2 Neuwürfe, Würfel antippen hält sie. Kombos (Pasch, Drilling, Vierling, Fünfling, Kleine/Große
Straße, Full House) werden wie `recognized_partition` erkannt; jede Kombo geht in Angriff, Schild oder Heilung
(Schild ×0,6). Sind alle Kombos zugewiesen, endet der Zug nach kurzer Bedenkzeit von selbst. Reihenfolge: Angriff →
Heilung → Schild → Gegner. Gift, Fluch (fixierter Würfel), Schwächen (−30 %) und der Gegnerblock sind übertragen,
ebenso der Wanderer-Bonus „Alles auf Angriff“ (+20 %, nicht im Tutorial).

Vereinfachungen für die Anzeige: Zwischen den Räumen rastet der Held (LP wieder voll), Räume 3–4 werden
übersprungen, und Neuwürfe treffen mit 30 % die Augenzahl der gehaltenen Würfel (etwas Würfelglück). Keine
Upgrades, keine Beute, kein Lager.

Bilder: Held und Gegner sind aus den 3D-Modellen des Spiels gerendert (`godot/tests/playable_render.gd` im
Spielprojekt, Ergebnis in `src/wuerfel-dungeon/sprites/`). Kampfhintergründe (`art/painted/fight-bg-1/-4`),
App-Symbol und die Schriften Cinzel und Inter (OFL) kommen aus dem Spielprojekt. Die Klänge erzeugt die Anzeige
mit den Rezepten aus `audio.js` des Spiels (Holz, Glocke, Luft, Aufprall), deshalb sind keine Audiodateien eingebettet.

Ablauf: Eine Hand zeigt im Tutorial-Kampf sofort, danach nach 5 s ohne Eingabe den nächsten sinnvollen Schritt
(Bewertung aller Zuweisungen wie `suggest_assignments`). Nach dem Boss erscheint die Endkarte mit Store-Knopf;
bei einer Niederlage „Revanche“ (Bosskampf mit vollen LP neu).

## Bauen und prüfen

Im Werbung-Repo, mit dem Spielprojekt auf der Platte und ffmpeg im PATH:

```powershell
node playables/src/wuerfel-dungeon/build.cjs "D:/Claude/Würfel Dungeon"
$env:WD_GAME = "D:/Claude/Würfel Dungeon"; node --test playables/src/wuerfel-dungeon/test.cjs
python -m http.server 8125 --bind 127.0.0.1
```

Dann `http://localhost:8125/playables/wuerfel-dungeon.html` oder der Testwirt
`http://localhost:8125/playables/src/wuerfel-dungeon/qa-host.html?sizes=360x540,510x360,320x480,390x844&lang=de`
(bettet die Anzeige wie die App per iframe ein, zeigt die Brücken-Nachrichten, Knöpfe für `wm:mute`/`pause`/`resume`).

`test.cjs` prüft Kombo-Werte und -Erkennung gegen `rules.gd`, Gegner-LP, Muster und Schaden gegen
`game-data.json`, die Tutorial-Würfe und an der gebauten Datei Eigenständigkeit, Brücke und Vollständigkeit der Sprachen.

Die Figuren neu rendern (im Spielprojekt, nicht headless):

```powershell
& "D:\Claude\Godot\Godot_v4.7.2-stable_win64_console.exe" --path godot --script res://tests/playable_render.gd -- --qa-ui "--out=D:/tmp/render"
```

und die PNGs mit ffmpeg auf 380 px Höhe als WebP nach `src/wuerfel-dungeon/sprites/` legen.

Sprachen wie im Spiel: `lang=de|en|fr|it|es|th|ko|ja|zh`, sonst die Gerätesprache mit Englisch als Fallback. Alle
Spielbegriffe (Kombos, Gegner, Ansagen) liest das Build-Skript aus den Sprachdateien des Spiels; Titel = lokalisierter
Store-Name. `muted=1` startet stumm. Ton läuft erst nach einer Nutzeraktion. Stummschalten, Seitenwechsel und Pause
stoppen den Ton, Pause hält auch Animationen und Abläufe an.

Ausgehend: `wm:ready` (`game: "wuerfel-dungeon"`, nach Schriften und erstem Bild, spätestens nach 400 ms),
`wm:cleared` (`level` 1–3 je besiegtem Gegner, `moves`) und `wm:cta` (Store-Ziel `com.patrickuhl.wuerfeldungeon`).
Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume` (als Objekt oder JSON-Text). Ohne Wirt fällt der
Store-Knopf auf `mraid.open` / `FbPlayableAd` / `dapi` / Link zurück. Die Anzeige vergibt keine Belohnung und hat
keinen eigenen Schließen-Countdown. Die Knöpfe sagen „Jetzt spielen“, nicht „kostenlos“.

## Einbinden

Seit 12.11.2026 in 19 Configs mit ausschließlich spielbaren Demos ausgewählt (bei Kettro auch rewarded, auch bei
Feierabend Rush und CANDLERIFT/lumenfall). Nicht in `wuerfel-dungeon-werbe-config.json` (eigene App) und nicht in
`claw-machine-heroes-werbe-config.json` (Werbemodul 1.0.0); Bild-/Video-Configs bleiben. Eintrag:

```json
{
  "id": "wuerfel-dungeon-playable",
  "kind": "game",
  "title": { "de": "Würfel Dungeon", "en": "Dice Dungeon" },
  "tagline": { "de": "Würfle Kombos, besiege den Würfelfresser – direkt hier.", "en": "Roll combos, beat the Dice Devourer – right here." },
  "icon": "https://patrickuhl1988.github.io/Werbung/images/icons/wuerfel-dungeon.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/wuerfel-dungeon.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/wuerfel-dungeon.html" }
  },
  "target": { "android": "com.patrickuhl.wuerfeldungeon" },
  "accent": "#f2c35a",
  "status": "live",
  "tags": ["playable", "roguelike"]
}
```

Symbol: `images/icons/wuerfel-dungeon.png` (256 px, App-Symbol des Spiels). Playables nie über
jsDelivr oder raw.githubusercontent.com laden (liefern `text/plain`).
