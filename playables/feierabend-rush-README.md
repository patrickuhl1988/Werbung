# Feierabend Rush – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/feierabend-rush.html

Eine eigenständige HTML-Datei (ca. 415 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Gespielt wird eine
Kurzfassung von Level 1 „Der Arbeitsweg“: vom Vorplatz über Wohn- und Hauptstraße (Autos, Lieferwagen, Fahrräder,
Bus), den Bahnübergang mit Straßenbahn und die E-Scooter-Spur bis zur Stempeluhr. 16 Reihen, 75 Sekunden, 3 Leben.

- **Steuerung wie im Spiel:** Tippen = ein Feld nach vorn, Wischen = in jede Richtung (Schwelle 24 px, löst schon
  während des Wischens aus). Pfeiltasten/WASD am Rechner.
- **Regeln aus der App:** Spurversatz, gekachelte Kollision mit Spieler- und Hindernis-Toleranz (0,32/0,18),
  Kaffee-Boost (6 s, Welt läuft mit 0,65), Hupen bei knappem Abstand, Checkpoints, Zielreihe nur über den
  Stempeluhr-Platz, Punkte und Sterne wie `evaluateRun()`. Tempo wie im Modus „Leicht“ (0,78).
- **Optik aus der App:** Sprites (Figur „Sachbearbeiter“, Auto, Lieferwagen, Bus, Straßenbahn, Fahrrad, E-Scooter,
  Münze, Kaffee) mit den Größen und Überständen aus `spriteManifest.ts`, Bodentexturen, Straßen-Kulisse oben und
  unten, HUD in Dunkelblau/Gold mit Herzen, Münzen und Zeitleiste. Zehn Originalklänge (hop, coin, crash, honk,
  goal, level-start, drei Stings, tap) als MP3.
- **Ablauf:** Start mit „Tippen zum Hüpfen“ und Hand an der Figur. Nach 4,5 s ohne Eingabe erscheint der Hinweis
  erneut. Vor dem Gleis: „Vorsicht, Straßenbahn!“ und blinkende Warnlichter, solange die Bahn naht. Im Ziel Konfetti,
  dann die Endkarte mit Sternen, Punkten, Store-Symbol, Merkmalen (4 Level, Roguelite, Beutezug, Tägliche Aufgabe),
  „Kostenlos spielen“ und „Noch einmal“. Ohne Leben oder Zeit kommt dieselbe Karte mit „Fast geschafft!“/„Zu spät!“.

Hochformat: Spielfeld randlos, HUD oben, Store-Knopf unten. Querformat: Spielfeld links, rechts HUD, Spielsymbol und
Store-Knopf.

## Quellen, Bauen und Prüfen

Quellen in `playables/src/feierabend-rush/`. Der Build liest Sprites, Texturen, Klänge und das Store-Symbol direkt aus
dem App-Projekt und nutzt dessen `sharp` und `ffmpeg-static` (kein Python, kein globales ffmpeg nötig):

```powershell
node playables/src/feierabend-rush/build.cjs playables/feierabend-rush.html --app "D:\Claude\frogger work"
$env:FEIERABEND_APP="D:\Claude\frogger work"; node --test playables/src/feierabend-rush/test.cjs
node playables/src/feierabend-rush/serve.cjs . 8117
```

Dann `http://localhost:8117/playables/feierabend-rush.html` oder der QA-Host
`http://localhost:8117/playables/src/feierabend-rush/qa-host.html` (Overlay-Größen, Sprache, `wm:mute`/`pause`/`resume`, Log).

- `test.cjs` prüft, dass Konstanten und Spuren 1:1 denen der App entsprechen (`engine.ts`, `level1.ts`, `easyFactor`),
  dass nach höchstens zwei Gefahrenreihen eine sichere kommt, dass ein vorsichtiger Bot aus jeder Startphase ohne
  Treffer und mit viel Zeitreserve ins Ziel kommt, die Auswertung, und dass die gebaute Datei eigenständig ist.
- Im Browser geprüft: 390×844, 360×540, 510×360, 844×390, Deutsch/Englisch/Französisch, Treffer bis zum Verlieren,
  Kaffee-Boost, Ziel mit Endkarte, Brücke im iframe.

`lang=de|en|es|fr|it|nl|pt` wählt die Sprache, sonst gilt die Gerätesprache mit Englisch als Fallback. `muted=1`
startet stumm. Ton läuft erst nach einer Nutzeraktion. Stummschalten, Seitenwechsel und Pause stoppen laufende Klänge,
Pause hält auch das Spiel an.

Ausgehend: `wm:ready` (nach dem ersten Bild, spätestens nach 400 ms), `wm:cleared` (`game: "feierabend-rush"`,
`level: 1`, `moves`, einmal beim ersten Erreichen der Stempeluhr) und `wm:cta` (Store-Ziel `de.patrickuhl.feierabendrush`).
Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume`. Android nutzt dieselbe
`ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. Außerhalb unserer Apps fällt der Store-Knopf auf
`mraid.open`, `FbPlayableAd`, `dapi` oder `window.open` zurück. Die Anzeige vergibt selbst keine Belohnung und setzt
keinen eigenen Schließen-Countdown.

## Einbinden

Seit 11.11.2026 als `feierabend-rush-playable` in allen 19 Configs mit ausschließlich spielbaren Demos (bei Kettro
auch rewarded), auch bei CANDLERIFT (`lumenfall-werbe-config.json`). Nicht in den beiden Feierabend-Rush-Configs
(eigene App, `excludeSelf`) und nicht in `claw-machine-heroes-werbe-config.json` (Werbemodul 1.0.0 kann keine Demos).
Bild-/Video-Configs bleiben unverändert. Symbol: `images/icons/feierabend-rush.png`.

```json
{
  "id": "feierabend-rush-playable",
  "kind": "game",
  "title": { "de": "Feierabend Rush", "en": "Feierabend Rush" },
  "tagline": { "de": "Durch den Berufsverkehr hüpfen, pünktlich stempeln – direkt hier.", "en": "Hop through rush hour and clock in on time – right here." },
  "icon": "https://patrickuhl1988.github.io/Werbung/images/icons/feierabend-rush.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/feierabend-rush.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/feierabend-rush.html" }
  },
  "target": { "android": "de.patrickuhl.feierabendrush" },
  "accent": "#ffb454",
  "status": "live",
  "tags": ["playable", "arcade"]
}
```
