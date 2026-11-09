# Claw Machine Heroes – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/claw-machine-heroes.html

Eine eigenständige HTML-Datei (486 KB), ohne externe Bibliotheken, Nachladen oder Tracking. 2D-Nachbau des Spielkerns mit den Originalgrafiken des Spiels (Automatenbaukasten „Neon Royal“, Ritter, Ente, Roboter, Schleimkönig, Gegenstände) und 16 Originalklängen als MP3: Klaue ziehen und loslassen, die Kapsel öffnet sich in ihrer Seltenheitsfarbe, Gegenstand anlegen, der Held kämpft automatisch und wird sichtbar stärker. Nach drei Griffen kommt der Boss, danach „Stage geschafft!“ und die Endkarte. Wer nur zuschaut, sieht trotzdem alles: Nach 6 s ohne Eingabe greift die Klaue selbst, das Popup legt nach 3,6 s automatisch an. Ablauf etwa 30 s.

## Bauen und prüfen

Quelle und Bauskript liegen im Projekt Claw Machine Heroes (`tools/playable/`, Grafiken und Klänge aus `game/assets`):

```powershell
python tools/playable/build_playable.py      # → build/playable/claw-machine-heroes.html + qa-host.html
node tools/playable/test_playable.cjs
python -m http.server 8106 --bind 127.0.0.1 --directory build/playable
```

`http://localhost:8106/qa-host.html` bettet die Anzeige wie das Werbemodul ein und prüft die Nachrichtenbrücke; `?auto=1` spielt sich selbst durch, `?size=740x360` zeigt das Querformat. `lang=de|en|es|fr|it|nl|pt` wählt die Sprache, sonst Gerätesprache mit Englisch als Fallback. `muted=1` startet stumm. Ton erst nach einer Nutzeraktion; Stummschalten, Seitenwechsel und Pause stoppen laufende Klänge.

Ausgehend: `wm:ready` (nach dem ersten Bild, spätestens nach 300 ms), `wm:cleared` (`game: "claw-machine-heroes"`, einmal nach dem Boss) und `wm:cta` (Store-Ziel `com.uhl.clawmachineheroes`). Eingehend vom Parent: `wm:mute` mit `muted`, `wm:pause`, `wm:resume` (Objekt oder JSON-Text). Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke wie die anderen Anzeigen. Ohne Host fällt der Store-Knopf auf `mraid.open`, `FbPlayableAd.onCTAClick` bzw. `dapi.openStoreUrl` zurück. Die Anzeige vergibt selbst keine Belohnung und setzt keinen eigenen Schließen-Countdown.

Geprüft: 223 statische Prüfungen (Größe, keine externen Adressen, Brücke, sieben Sprachen, alle Bilder und Klänge), kompletter Ablauf im iframe bis `wm:cleared` und `wm:cta`, `wm:pause`/`wm:resume`/`wm:mute`, Hochformat 320×568, 360×640 und 412×915, Querformat 740×360. Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden.

## Einbinden

Aktiv in `config/kettro-werbe-config.json` (`claw-machine-heroes-playable`, je ein Viertel) – wirksam ab dem Kettro-Build mit Ordner-Freigabe. Außerdem in `arrow-puzzle-werbe-config.json`: wirksam ab dem Arrow-Puzzle-Build nach 1.14.0, der die Auswahl aus der Config übernimmt. Mühle Meister sperrt seine Auswahl im App-Code (`lockedConfig`). Eintrag für `creatives`:

```json
{
  "id": "claw-machine-heroes-playable",
  "kind": "game",
  "title": { "de": "Claw Machine Heroes", "en": "Claw Machine Heroes" },
  "tagline": { "de": "Greifen, ausrüsten, siegen – probier den Greifautomaten direkt hier.", "en": "Grab, gear up, win – try the claw machine right here." },
  "icon": "icons/claw-machine-heroes.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/claw-machine-heroes.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/claw-machine-heroes.html" }
  },
  "target": { "android": "com.uhl.clawmachineheroes" },
  "accent": "#ff3f8e",
  "status": "live",
  "tags": ["playable", "idle"]
}
```
