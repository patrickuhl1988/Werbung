# Mühle Meister – spielbare Anzeige (Variante „Zwickmühle“)

Live: https://patrickuhl1988.github.io/Werbung/playables/muehle-meister.html

Zweite Mühle-Demo neben `muehle.html` (Endspiel-Variante). Nach dem Vergleich am 09.11.2026 gewählt: Die Creative-ID
`muehle-meister-playable` zeigt jetzt überall auf diese Datei. `muehle.html` bleibt liegen, wird aber von keiner Config
mehr verwendet.

Eine eigenständige HTML-Datei (277 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Drei kurze Rätsel, die
nacheinander die Kernmomente des Spiels zeigen:

1. **Setzen** – den dritten Stein aus dem Vorrat setzen und die Mühle schließen, dann schlagen.
2. **Ziehen** – einen Stein entlang der Linie zur Mühle schieben. Die schwarze Mühle ist geschützt: Ein Tipp darauf
   erklärt die Regel.
3. **Zwickmühle** – die Mühle öffnen und dabei die nächste schließen. Schwarz zieht dazwischen, kann aber nicht blocken.
   Zurückziehen schließt wieder eine Mühle: zwei Schläge in zwei Zügen. Danach folgt die Endkarte mit Store-Icon,
   „Kostenlos spielen“ und „Noch einmal“.

Jedes Rätsel hat genau einen Gewinnzug. Ein falscher Zug läuft sichtbar zurück, danach zeigt eine Hand den
Lösungsweg. Ohne Eingabe erscheint der Hinweis nach 2–5 s von selbst, außerdem über den Glühbirnen-Knopf.

Die Optik folgt der App (Monochrom-Redesign): Keramikbrett aus `ClassicBoardSurface.tsx`, Steine aus
`ClassicStoneSurface.tsx`, Inter als Schrift. Die Animationen nutzen dieselben Bahnformeln und Zeiten wie
`stoneFx.tsx`/`MillSweep.tsx`/`Stone.tsx`: Einflug aus dem Vorrat mit Nachzieh-Spur, Landung mit Ringwelle und Staub,
goldenes Mühlen-Band vom schließenden Stein mit Lichtpunkten und Sternen, nacheinander aufploppende Steine,
gestrichelter drehender Zielring und Zerplatzen mit Splittern und roter Druckwelle. Zehn Originalklänge der App
(place, move, select, invalid, mill, zwick, remove, puzzle-solved, win, button-tap) sind als MP3 eingebettet.

## Quellen, Bauen und Prüfen

Quellen in `playables/src/muehle-meister/`, die Arbeitskopie liegt im Mühle-Projekt unter `scripts/playable/`.
Der Build braucht die App-Assets (Sounds, Inter, Store-Icon), ffmpeg sowie Python mit fontTools + brotli:

```powershell
node playables/src/muehle-meister/build.cjs playables/muehle-meister.html --app "D:\Mobile Games\mühle claude"
$env:MUEHLE_APP="D:\Mobile Games\mühle claude"; node --test playables/src/muehle-meister/test.cjs
node playables/src/muehle-meister/e2e.cjs playables/muehle-meister.html
```

- `test.cjs` prüft, dass Nachbarschaft, Mühlen-Linien und Knotenkoordinaten 1:1 denen der App entsprechen, dass jedes
  Rätsel genau einen Gewinnzug hat, dass die schwarze Mühle geschützt ist und dass Schwarz die Zwickmühle nach keinem
  möglichen Schlag verhindern kann.
- `e2e.cjs` spielt in headless Edge mit echten Touch-Events alle drei Rätsel durch: 6 Größen (360×540 und 510×360 wie
  im Werbe-Overlay, 390×844, 320×420, 844×390, 1024×600) × 7 Sprachen. Geprüft werden die Brücke, falsche Züge,
  der geschützte Stein, Überlauf, abgeschnittene Titel, die Endkarte und JavaScript-Fehler.
- `qa-host.html` bettet die Anzeige wie die App in ein iframe ein (Größen, Sprache, `wm:mute`/`pause`/`resume`, Log).
  Im Werbung-Repo: `python -m http.server 8107` im Repo-Ordner, dann
  `http://localhost:8107/playables/src/muehle-meister/qa-host.html?src=../../muehle-meister.html`.

`lang=de|en|es|fr|it|nl|pt` wählt die Sprache, sonst gilt die Gerätesprache mit Englisch als Fallback. `muted=1`
startet stumm. Ton läuft erst nach einer Nutzeraktion. Stummschalten, Seitenwechsel und Pause stoppen laufende Klänge.

Ausgehend: `wm:ready` (nach dem ersten Bild, spätestens nach 400 ms), `wm:cleared` (`game: "muehle-meister"`,
`level: 3`, einmal nach dem letzten Rätsel) und `wm:cta` (Store-Ziel `app.muehle.muehle`). Eingehend vom Parent:
`wm:mute` mit `muted`, `wm:pause`, `wm:resume`. Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die
anderen Anzeigen. Außerhalb unserer Apps fällt der Store-Knopf auf `mraid.open`, `FbPlayableAd`, `dapi` oder
`window.open` zurück. Die Anzeige vergibt selbst keine Belohnung und setzt keinen eigenen Schließen-Countdown.

## Einbinden

Eingetragen (Creative + `selectedIds`, bei Kettro auch `rewarded.selectedIds`) seit 09.11.2026 in:
`arrow-puzzle-werbe-config.json`, `claw-machine-heroes-playables-config.json`, `claw-machine-heroes-werbe-config.json`,
`kettro-werbe-config.json` (wie Königinnen) sowie `dame-playables-config.json`, `drop-match-playables-config.json` und
`calm-arrow-puzzle-playables-config.json` (dort ersetzt sie die Endspiel-Variante). Akzentfarbe `#e0b15e` wie im Katalog des Werbemoduls.

Neue Configs wie `koeniginnen-playable`: Eintrag in `creatives`, ID in `selectedIds` (und bei Kettro zusätzlich in
`rewarded.selectedIds`). In der Mühle-Meister-App selbst nicht eintragen (`excludeSelf`).

```json
{
  "id": "muehle-meister-playable",
  "kind": "game",
  "title": { "de": "Mühle Meister", "en": "Nine Men's Morris" },
  "tagline": { "de": "Schließe die Mühle, meistere die Zwickmühle – direkt hier spielen.", "en": "Close the mill, master the double mill – play it right here." },
  "icon": "icons/muehle-meister.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/muehle-meister.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/muehle-meister.html" }
  },
  "target": { "android": "app.muehle.muehle" },
  "accent": "#e0b15e",
  "status": "live",
  "tags": ["playable", "board"]
}
```

Kettro lädt Playables aus der Config ohne neuen Build
(seit dem Drei-Spiele-Adapter genügt die Origin-Allowlist). Arrow Puzzle (ab dem Build nach 1.14.0) und Claw Machine Heroes (ab dem nächsten Build)
übernehmen die Auswahl aus ihrer Config; ältere Builds sperren sie im Code (`lockedConfig`).
