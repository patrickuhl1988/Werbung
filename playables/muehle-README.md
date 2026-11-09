# Mühle Meister – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/muehle.html

Eine eigenständige HTML-Datei (226 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Gespielt werden die ersten drei Rätsel des kostenlosen Pakets „Endspiele mit drei Steinen“ (`endgame` 1–3), jeweils „Sieg in einem Zug“: Stein ziehen, Mühle schließen, gegnerischen Stein schlagen. Regeln, Züge, Schlagen und Lösungsbäume kommen aus der originalen App-Engine (über das Wiki-Bündel `assets/wiki/muehle-meister/muehle-engine.js` im gamestudio-Repo, auf die nötigen Module gekürzt: 42 statt 164 KB). Brett „Klassisch“, Steine, Mühlenlinie, Schlag-Ringe, Zeitlupe beim letzten Schlag und Banner folgen dem Wiki-Brett, das die App-Komponenten nachbildet. Zehn Originalklänge der App sind als M4A eingebettet.

Ein falscher Zug wird nach 1,4 s zurückgesetzt. **Tipp** zeigt Stein und Ziel des Gewinnzugs mit grünem Ring. Nach dem dritten Rätsel pulsiert der Store-Knopf.

## Bauen und prüfen

Im Werbung-Repo, mit einem Checkout von `patrickuhl1988/gamestudio` daneben:

```powershell
node playables/src/muehle/build.cjs --gamestudio ..\gamestudio
node --test playables/src/muehle/test.cjs
python -m http.server 8106 --bind 127.0.0.1
```

Dann `http://localhost:8106/playables/muehle.html`. `lang=de|en|es|fr|it|nl|pt` wählt die Sprache, sonst gilt die Gerätesprache mit Englisch als Fallback. `muted=1` startet stumm. Ton läuft erst nach einer Nutzeraktion. Stummschalten, Seitenwechsel und Pause stoppen laufende Klänge.

Ausgehend: `wm:ready`, `wm:cleared` (`game: "muehle-meister"`, `level` 1–3, einmal je Rätsel) und `wm:cta` (Store-Ziel `app.muehle.muehle`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume`. Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. `wm:ready` geht nach dem ersten Bild raus, spätestens nach 300 ms. Die Anzeige vergibt selbst keine Belohnung und setzt keinen eigenen Schließen-Countdown.

Geprüft: Lösungsbaum gleich allen Gewinnzügen der Engine, mindestens drei falsche Züge je Rätsel, Gewinnzug Schritt für Schritt, Brücke im iframe (`wm:ready`, `wm:cleared` ×3, `wm:cta`, `wm:mute` als Objekt und als JSON-Text), sieben Sprachen ohne Abschneiden oder Scrollen bei 320×560, Hochformat 375×812 und Querformat 844×390. Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden.

## Einbinden

Noch in keiner Config aktiv. Eintrag für `creatives` (wie `koeniginnen-playable`), dann die ID in `selectedIds` aufnehmen:

```json
{
  "id": "muehle-meister-playable",
  "kind": "game",
  "title": { "de": "Mühle Meister", "en": "Nine Men's Morris Master" },
  "tagline": { "de": "Schließe die Mühle. Drei echte Rätsel – direkt hier spielen.", "en": "Close the mill. Three real puzzles – play them right here." },
  "icon": "icons/muehle-meister.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/muehle.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/muehle.html" }
  },
  "target": { "android": "app.muehle.muehle" },
  "accent": "#C97721",
  "status": "live",
  "tags": ["playable", "puzzle"]
}
```

In der Mühle-Meister-App selbst nicht eintragen (`excludeSelf`). Kettro braucht wie bei Königinnen einen neuen Build, weil `integrations/kettro/promo.gd` nur fest freigegebene Playable-Dateien lädt.
