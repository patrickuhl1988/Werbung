# Plush Parade – spielbare Anzeige

Live: https://patrickuhl1988.github.io/Werbung/playables/plush-parade.html

Eine eigenständige HTML-Datei (~470 KB), ohne externe Bibliotheken, Nachladen oder Tracking. 2D-Fassung des Spielkerns
mit den Originalgrafiken (Automat, Haken, Kordel, Plüschtiere, Kapselband, Greifer), 19 Originalklängen und einer
Schleife aus der Spielmusik („Lofi Gaming“, zephiramusic/Pixabay, auf ~ -36 LUFS wie die übrigen Anzeigen):
Plüschis hängen an vier Ketten, nur das untere Ende ist greifbar. Gruppe antippen (oder ziehen) und an eine leere
Kette oder an gleiche Tiere hängen. Hängen vier Gleiche unten, schnappt der Greifer das Set und wirft es in die
passende Kapsel (Punkte ×1, ×2, ×3). Nach drei Sets „Automat geschafft!“ mit drei Sternen, danach die Endkarte.
Wer nur zuschaut, sieht trotzdem alles: Ein Finger zeigt den nächsten Zug, nach 6 s ohne Eingabe (danach alle 3,4 s)
spielt die Anzeige den Zug selbst. Ablauf etwa 25–35 s.

App: Plush Parade: Claw Sort (`com.patrickuhl.luckycatch`, dieselbe Play-Store-App wie zuvor Lucky Catch).

## Bauen und prüfen

Quelle und Bauskript liegen im Projekt Lucky Catch (`tools/playable/`, Grafiken und Klänge aus `godot/assets`):

```powershell
python tools/playable/build_playable.py      # → build/playable/plush-parade.html + qa-host.html
node tools/playable/test_playable.cjs
python tools/playable/prepare_werbung.py --repo ../Werbung   # Datei, Symbol und Configs hierher, ohne Commit
```

`qa-host.html` bettet die Anzeige wie das Werbemodul ein und protokolliert die Nachrichten; `?auto=1` spielt sich
selbst durch, `?size=740x360` zeigt das Querformat. Direkt: `plush-parade.html?qa=auto` (Autoplay), `?qa=debug`
(`window.__ppQA.state()`), `?speed=0.2` (Zeitlupe). `lang=de|en|es|fr|it|nl|pt` wählt die Sprache, sonst
Gerätesprache mit Englisch als Fallback. `muted=1` startet stumm. Ton erst nach einer Nutzeraktion; Stummschalten,
Seitenwechsel und Pause stoppen Klänge und Musik.

Ausgehend: `wm:ready` (nach dem ersten Bild, spätestens nach 300 ms), `wm:cleared` (`game: "plush-parade"`, einmal
nach dem dritten Set) und `wm:cta` (Store-Ziel `com.patrickuhl.luckycatch`). Eingehend vom Parent: `wm:mute` mit
`muted`, `wm:pause`, `wm:resume` (Objekt oder JSON-Text). Android nutzt dieselbe `ReactNativeWebView.postMessage`-Brücke
wie die anderen Anzeigen. Ohne Host fällt der Store-Knopf auf `mraid.open`, `FbPlayableAd.onCTAClick` bzw.
`dapi.openStoreUrl` zurück. Eingebettet entfällt der eigene Store-Knopf oben (`wm-embed`), der JOCULUS-Schriftzug
(`wm-brand`) steht unten über dem Hinweis. Die Anzeige vergibt selbst keine Belohnung und setzt keinen
Schließen-Countdown.

Geprüft: 192 statische Prüfungen (Größe, keine externen Adressen, Brücke, sieben Sprachen, alle Bilder und Klänge),
kompletter Ablauf im iframe bis `wm:cleared` und Endkarte, Hochformat 320×568 und 375×812, Querformat 740×360.
Die native Android-WebView muss zusätzlich auf einem Gerät geprüft werden.

## Einbinden

Seit 23.11.2026 in allen Configs, die schon spielbare Anzeigen führen (22 Dateien): `arrow-puzzle-werbe`,
`bellmoor-playables`, `calm-arrow-puzzle-playables`, `claw-machine-heroes-playables`, `dame-playables`,
`drop-match-playables`, `feierabend-rush-playables`, `fundfieber-playables`, `kettro-werbe` (auch `rewarded`),
`koeniginnen-playables`, `lumenfall-werbe`, `muehle-playables`, `neon-ricochet-playables`, `pocket-planet-playables`,
`pop-order-playables`, `quiznova-playables`, `relic-tower-playables`, `sonaris-playables`, `sort-rush-playables`,
`tiefsee-tempel-playables`, `wuerfel-dungeon-werbe`, `zip-werbe` (nur `config`; die Belohnungsliste dort bleibt bei Arrow Puzzle).

Nicht eingetragen: `lucky-catch-*` (das ist die App selbst) und `claw-machine-heroes-werbe-config.json`
(Werbemodul 1.0.0 kann keine Demos darstellen). Apps, die ihre Auswahl im Code sperren (z. B. Mühle Meister,
Arrow Puzzle bis 1.14.0), zeigen die Demo erst mit einem Build, der die Auswahl aus der Config übernimmt.

Eintrag für `creatives`:

```json
{
  "id": "plush-parade-playable",
  "kind": "game",
  "title": { "de": "Plush Parade", "en": "Plush Parade" },
  "tagline": { "de": "Plüschis sortieren, Kapseln füllen – probier den Greifautomaten direkt hier.", "en": "Sort the plushies, fill the capsules – try the claw machine puzzle right here." },
  "icon": "https://patrickuhl1988.github.io/Werbung/images/icons/plush-parade.png",
  "media": {
    "portrait": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/plush-parade.html" },
    "landscape": { "type": "playable", "src": "https://patrickuhl1988.github.io/Werbung/playables/plush-parade.html" }
  },
  "target": { "android": "com.patrickuhl.luckycatch" },
  "accent": "#ff5c8d",
  "status": "live",
  "tags": ["playable", "puzzle"]
}
```
