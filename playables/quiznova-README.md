# QuizNova – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/quiznova.html

Eine eigenständige HTML-Datei (≈ 230 KB), ohne externe Bibliotheken, Nachladen oder Tracking. Eine Mini-Runde QuizNova: drei echte Fragen aus dem Spiel mit ihren Originalbildern, vier Antwortkarten, grün/rot mit Punkten, Serienbonus, Konfetti und dem „Did you know?“-Fakt aus dem Spiel. Danach die Endkarte (Ergebnis, „1.500+ Fragen · 8 Kategorien · 6 Sprachen · offline · für Kinder“) mit Store-Knopf und „Noch eine Runde“ (die nächsten drei Fragen). Wer nur zuschaut, sieht trotzdem alles: nach 4,5 s ohne Eingabe zeigt eine Hand auf die richtige Antwort, nach 9 s antwortet die Anzeige selbst. Ablauf etwa 25 s.

Sechs Fragen (Science, Film, Sport, Geography, History), Texte in Englisch, Deutsch, Spanisch, Französisch, Italienisch und Thai – direkt aus `data/questions/<sprache>/` des Spiels. Sprache per `?lang=` oder Gerätesprache, sonst Englisch. Klänge (richtig, falsch, Serie) aus dem Spiel, erst nach einer Nutzeraktion; `?muted=1` startet stumm.

## Bauen und prüfen

Quelle und Bauskript liegen im QuizNova-Projekt (`D:/Claude/Quiz`):

```powershell
node scripts/playable/build.mjs          # → playable/quiznova.html + playable/qa-host.html
python -m http.server 8131 --directory playable
```

`http://localhost:8131/qa-host.html` bettet die Anzeige wie das Werbemodul ein und protokolliert die Brücke; `?size=740x360` zeigt das Querformat, `?lang=de|en|es|fr|it|th` die Sprache.

Ausgehend: `wm:ready` (genau einmal, nach dem ersten Bild, spätestens nach 300 ms), `wm:cleared` (`game: "quiznova"`, `correct`, `total`; einmal nach der ersten Runde) und `wm:cta` (Store-Ziel `de.uhl.quiznova`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume` (Objekt oder JSON-Text). Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. Ohne Host fällt der Store-Knopf auf `mraid.open`, `FbPlayableAd.onCTAClick` bzw. `dapi.openStoreUrl` zurück. Die Anzeige vergibt selbst keine Belohnung und setzt keinen eigenen Schließen-Countdown.

Geprüft (09.11.2026, Browser-Wirt): Hochformat 390×780 und Querformat 740×360; Deutsch, Englisch, Thai; richtige und falsche Antwort, Endkarte, „Noch eine Runde“; `wm:ready` einmal, `wm:cleared`, `wm:cta` mit Store-Adresse; Hand nach 4,5 s, Selbstlauf nach 9 s; `wm:pause` hält die Runde an (auch mitten in der Auflösung), `wm:resume` setzt sie fort, `wm:mute` schaltet stumm; keine Konsolenfehler; einzige externe Adresse ist der Play-Store-Link. Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden.

## Einbinden

Aktiv (09.11.2026) in `dame-playables-config.json`, `muehle-playables-config.json`, `zip-werbe-config.json` und `kettro-werbe-config.json` (dort auch `rewarded`; wirksam ab dem Kettro-Build mit Ordner-Freigabe). Arrow Puzzle und Claw Machine Heroes sperren ihre Auswahl im Code/Adapter; dort braucht die Demo einen neuen App-Build. In QuizNova selbst nie eintragen (`excludeSelf`). Das Icon liegt unter `images/icons/quiznova.png`, weil ältere App-Bundles keinen Eintrag `quiznova-playable` kennen. Eintrag für `creatives`:

```json
{
  "id": "quiznova-playable",
  "kind": "game",
  "title": { "de": "QuizNova", "en": "QuizNova" },
  "tagline": { "de": "Drei Fragen, ein Versuch: Wie viel weißt du? Direkt hier spielen.", "en": "Three questions, one shot: how much do you know? Play it right here." },
  "icon": "https://patrickuhl1988.github.io/Werbung/images/icons/quiznova.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/quiznova.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/quiznova.html" }
  },
  "target": { "android": "de.uhl.quiznova" },
  "accent": "#8b7bff",
  "status": "live",
  "tags": ["playable", "quiz"]
}
```
