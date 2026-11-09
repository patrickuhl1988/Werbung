# Dame Meister – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/dame-meister.html

Eine eigenständige HTML-Datei (157 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Gespielt werden drei echte Tagesrätsel aus der App (`lib/puzzles/data.ts`), jeweils Weiß am Zug:

1. **Schlag zu** – 1 Zug: die Dame schlägt drei Steine auf einmal (Schlagzwang, drei Schlagmöglichkeiten).
2. **Zwei Züge voraus** – erst stellen, nach der Antwort folgt der Dreifachschlag.
3. **Ein Opfer für den Sieg** – ein Stein wird geopfert, danach schlägt die Dame drei.

Regeln (deutsche Dame: Schlagzwang, fliegende Dame, Rückwärtsschlagen) und die Verteidigung des Gegners sind die Original-Dateien der App (`lib/game/rules.ts`, `lib/game/ai.ts` mit den Einstellungen des Tagesrätsels), mit esbuild auf 11 KB gebündelt. Wie in der App gilt jeder Weg, der den Vorsprung erreicht. Brett „Klassisch“, Elfenbein- und Anthrazitsteine, Krone, Holzrahmen, Schriften (Fraunces, DM Sans) und Farben folgen der App. Sieben Originalklänge sind als MP3 eingebettet.

Bedienung wie in der App: Stein antippen, markiertes Zielfeld antippen. **Tipp** zeigt Stein und Ziel mit grünem Rahmen, **Zurück** nimmt den letzten eigenen Zug samt Antwort zurück, **Neustart** setzt das Rätsel zurück. Nach dem dritten Rätsel pulsiert der Store-Knopf.

## Bauen und prüfen

Quelle im Dame-Projekt (`D:/Claude/Dame`, Ordner `scripts/playable/`):

```powershell
node scripts/playable/build.cjs   # -> playable/dame-meister.html
node scripts/playable/test.cjs
```

Danach im Werbemodul `node scripts/build-playables.mjs` (Eintrag `dameMeister`) und die Datei hierher kopieren. `lang=de|en` wählt die Sprache (sonst Gerätesprache, Englisch als Fallback), `muted=1` startet stumm. Ton läuft erst nach einer Nutzeraktion.

Ausgehend: `wm:ready` (`game: "dame-meister"`), `wm:cleared` (`level` 1–3, `moves`), `wm:cta` (Store-Ziel `de.damemeister.app`). Eingehend: `wm:mute` mit `muted`, `wm:pause`, `wm:resume` (als Objekt oder JSON-Text). Ohne Wirt fällt der Store-Knopf auf `mraid.open` / `FbPlayableAd` / `dapi` / Link zurück. Die Anzeige vergibt keine Belohnung und hat keinen eigenen Schließen-Countdown.

Geprüft: alle drei Rätsel mit Original-Regeln, Verteidigung antwortet wie in der App; Durchspielen über die Bedienknöpfe im Browser, Fehlzug, Schlagzwang-Hinweis, Zurück, Tipp, Neustart; Brücke (`wm:cleared` ×3, `wm:cta`); 375×812, 320×568 und 740×360 ohne Scrollen. Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden.

## Einbinden

Noch in keiner Config aktiv. Braucht einen App-Build mit Werbemodul 1.2.0 (Medientyp `playable`, `react-native-webview`). Eintrag für `creatives`, dann die ID in `selectedIds` aufnehmen:

```json
{
  "id": "dame-meister-playable",
  "kind": "game",
  "title": { "de": "Dame Meister", "en": "Checkers Master" },
  "tagline": { "de": "Schlag zu: Drei echte Dame-Rätsel – direkt hier spielen.", "en": "Strike now: three real checkers puzzles – play them right here." },
  "icon": "icons/dame-meister.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/dame-meister.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/dame-meister.html" }
  },
  "target": { "android": "de.damemeister.app" },
  "accent": "#206A65",
  "status": "live",
  "tags": ["playable", "puzzle", "board"]
}
```

Im Werbemodul (`core/catalog.ts`) ist `dame-meister-playable` bereits enthalten; Apps mit diesem Katalog brauchen den `creatives`-Eintrag nicht, nur die ID in `selectedIds`. Playables nie über jsDelivr oder raw.githubusercontent.com laden (liefern `text/plain`).
